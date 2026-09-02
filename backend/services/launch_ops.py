"""
ComfyUI 内核进程管理服务

负责启动 / 停止 ComfyUI，并维护真实 PID 与输出日志。
启动后按 --port 记录访问地址。
"""
import os
import subprocess
import sys
import threading

CREATE_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0

_procs = {}
_lock = threading.Lock()
_next_id = [1]


def _read_stream(stream, sink):
    try:
        for line in iter(stream.readline, ""):
            if not line:
                break
            sink.append(line.rstrip("\r\n"))
    except Exception:  # noqa: BLE001
        pass


def start(comfy_root, python=None, port=8188, extra_args=None, on_log=None):
    """启动 ComfyUI 主进程，返回真实 PID。"""
    if not comfy_root or not os.path.isdir(comfy_root):
        return {"ok": False, "error": "ComfyUI 目录不存在：{}".format(comfy_root), "log": []}

    from .env_ops import _python_of, PythonNotFoundError
    try:
        py = python or _python_of(comfy_root)
    except PythonNotFoundError as e:
        return {"ok": False, "error": str(e), "log": []}
    if not os.path.exists(py):
        return {"ok": False, "error": "Python 解释器不存在：{}".format(py), "log": []}

    main_py = os.path.join(comfy_root, "main.py")
    if not os.path.exists(main_py):
        return {"ok": False, "error": "未找到入口文件：{}".format(main_py), "log": []}

    cmd = [py, main_py, "--port", str(port)]
    cmd += list(extra_args or [])

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=comfy_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": "启动失败：{}: {}".format(type(e).__name__, e), "log": []}

    with _lock:
        pid_key = _next_id[0]
        _next_id[0] += 1
        _procs[pid_key] = {"proc": proc, "lines": [], "port": port, "root": comfy_root}

    if proc.stdout is not None:
        t = threading.Thread(target=_read_stream, args=(proc.stdout, _procs[pid_key]["lines"]), daemon=True)
        t.start()

    return {
        "ok": True,
        "data": {"id": pid_key, "pid": proc.pid, "port": port, "url": "http://127.0.0.1:{}".format(port), "cmd": " ".join(cmd)},
        "log": ["$ {}".format(" ".join(cmd)), "进程已启动，真实 PID={}".format(proc.pid)],
    }


def status(task_id=None):
    """查询进程状态与最新输出。"""
    with _lock:
        if task_id is None:
            if not _procs:
                return {"ok": True, "data": {"running": False}, "log": []}
            task_id = max(_procs.keys())
        item = _procs.get(task_id)
        if not item:
            return {"ok": False, "error": "进程不存在：{}".format(task_id), "log": []}
        proc = item["proc"]
        alive = proc.poll() is None
        return {
            "ok": True,
            "data": {
                "id": task_id,
                "pid": proc.pid,
                "running": alive,
                "exitCode": proc.returncode,
                "port": item["port"],
                "url": "http://127.0.0.1:{}".format(item["port"]),
            },
            "log": item["lines"][-200:],
        }


def stop(task_id=None):
    """停止进程（先尝试优雅终止，超时后强杀）。"""
    with _lock:
        if task_id is None:
            if not _procs:
                return {"ok": True, "data": {}, "log": ["没有正在运行的进程"]}
            task_id = max(_procs.keys())
        item = _procs.get(task_id)
        if not item:
            return {"ok": False, "error": "进程不存在：{}".format(task_id), "log": []}
        proc = item["proc"]

    if proc.poll() is not None:
        return {"ok": True, "data": {"id": task_id}, "log": ["进程已结束"]}

    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()

    """
     * 注意：这里不拼接进程尾部日志。进程被 terminate 时尾部往往
     * 是被杀瞬间的半截输出或异常栈（uvloop 关闭噪音等），
     * 拼进返回值会被误读为「停止导致异常」。
    """
    log = ["进程已停止，PID={}".format(proc.pid)]
    with _lock:
        _procs.pop(task_id, None)
    return {"ok": True, "data": {"id": task_id, "pid": proc.pid}, "log": log}


def open_browser(port=8188):
    """在系统默认浏览器中打开 ComfyUI 界面。"""
    import webbrowser
    url = "http://127.0.0.1:{}".format(port)
    try:
        webbrowser.open(url)
        return {"ok": True, "data": {"url": url}, "log": ["已在浏览器中打开 {}".format(url)]}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e), "log": []}
