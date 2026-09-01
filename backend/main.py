"""
ComfyUI_KK 启动器 —— Python Eel 后端入口

启动流程：
  1. 检查并静默安装后端依赖（eel / imageio-ffmpeg 等），用户无感
  2. 用 Eel 托管前端 dist 产物
  3. 暴露全部后端能力给前端（@eel.expose）

前端通过 window.eel.xxx() 调用，返回统一结构 { ok, data, error, log }。
"""
import os
import queue
import sys
import threading
import time

MAIN_TASKS = queue.Queue()
_MAIN_STARTED = False


def _pump_main_tasks():
    """主线程泵：持续消费投递过来的任务，保证 tkinter 只在主线程运行。"""
    while True:
        fn = MAIN_TASKS.get()
        try:
            fn()
        except Exception:  # noqa: BLE001
            pass


def _ensure_main_pump():
    global _MAIN_STARTED
    if _MAIN_STARTED:
        return
    _MAIN_STARTED = True
    threading.Thread(target=_pump_main_tasks, daemon=True).start()


def run_on_main(fn, timeout=600):
    """
    把 fn 投递到主线程执行并同步等待结果。

    tkinter 只能在主线程创建 Tk()，而 Eel 的暴露函数运行在
    gevent/工作线程里，直接在那里弹对话框会挂死或无响应，
    因此所有原生对话框都必须经此转发。
    """
    _ensure_main_pump()
    box = {}

    def job():
        try:
            box["v"] = fn()
        except Exception as e:  # noqa: BLE001
            box["e"] = e

    MAIN_TASKS.put(job)
    waited = 0.0
    while waited < timeout:
        if "v" in box or "e" in box:
            break
        time.sleep(0.05)
        waited += 0.05
    if "e" in box:
        raise box["e"]
    return box.get("v")


for _stream in ("stdout", "stderr"):
    _s = getattr(sys, _stream, None)
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

WEB_DIR = os.path.join(ROOT_DIR, "dist")

from services import env_ops, ffmpeg_ops, fs_ops, git_ops, launch_ops, pip_ops, plugin_ops  # noqa: E402

REQUIREMENTS = os.path.join(BASE_DIR, "requirements.txt")


# ---------------------------------------------------------------- 依赖自愈

def _ensure_deps():
    """首次启动时静默安装缺失依赖；失败不阻塞启动，只记录。"""
    try:
        import eel  # noqa: F401
        return
    except Exception:  # noqa: BLE001
        pass

    print("[backend] 正在安装后端依赖（首次启动，约需 1-2 分钟）...")
    import subprocess
    r = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        creationflags=0x08000000 if sys.platform == "win32" else 0,
    )
    _safe_print(_decode(r.stdout or b""))
    print("[backend] 依赖安装" + ("完成" if r.returncode == 0 else "失败"))


_ensure_deps()

import eel  # noqa: E402

eel.init(WEB_DIR)


def _inject_eel_js():
    """
    Eel 0.18 不再自动往 index.html 注入 <script src="/eel.js">，
    这里在每次启动前补上，保证 window.eel 一定可用。
    """
    html_path = os.path.join(WEB_DIR, "index.html")
    if not os.path.exists(html_path):
        return
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
    except OSError:
        return
    if "/eel.js" in html or "eel.js" in html:
        return
    html = html.replace("</head>", '  <script src="/eel.js"></script>\n  </head>')
    try:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
    except OSError:
        pass


# ---------------------------------------------------------------- 通用

def _decode(raw):
    """把子进程字节输出安全解码为文本，避免 GBK 控制台崩溃。"""
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="replace")
    return raw or ""


def _safe_print(text):
    """Windows 中文控制台为 GBK，遇到无法编码的字符会抛异常，这里统一兜底。"""
    try:
        print(text)
    except UnicodeEncodeError:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        print(str(text).encode(enc, errors="replace").decode(enc, errors="replace"))


def _ok(data=None, log=None):
    return {"ok": True, "data": data or {}, "error": "", "log": log or []}


def _fail(msg, log=None):
    return {"ok": False, "data": {}, "error": msg, "log": log or []}


# ---------------------------------------------------------------- 依赖文本比对

def _parse_requirements(text):
    """解析 requirements.txt 为 {name: spec}，语义与前端 api.js 保持一致。"""
    import re
    out = {}
    for raw in (text or "").splitlines():
        line = raw.split(" #")[0].strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        m = re.match(r"^([A-Za-z0-9_.\-]+)\s*(==|>=|<=|~=|!=|>|<)?\s*(.*)$", line)
        if not m:
            continue
        out[m.group(1).lower()] = (m.group(3) or "").strip()
    return out


def compare_requirements(base_text, target_text):
    """比对两份依赖文本，返回 added / removed / changed 三组差异。"""
    base = _parse_requirements(base_text)
    target = _parse_requirements(target_text)

    added, removed, changed = [], [], []
    for name, spec in target.items():
        if name not in base:
            added.append("{}=={}".format(name, spec) if spec else name)
        elif base[name] != spec:
            changed.append({"name": name, "from": base[name] or "未指定", "to": spec or "未指定"})
    for name, spec in base.items():
        if name not in target:
            removed.append("{}=={}".format(name, spec) if spec else name)

    return {
        "added": sorted(added),
        "removed": sorted(removed),
        "changed": sorted(changed, key=lambda x: x["name"]),
    }


@eel.expose
def backend_ready():
    """前端探测后端是否可用。"""
    return _ok({"version": "1.0.0", "python": sys.version.split()[0], "web": WEB_DIR})


# ---------------------------------------------------------------- 环境

@eel.expose
def env_detect(comfy_root=None):
    return env_ops.detect(comfy_root)


@eel.expose
def env_validate_root(path):
    return env_ops.validate_root(path)


@eel.expose
def env_scan_root(path):
    """真实扫描一个绝对路径，识别 ComfyUI 内核目录、Python 解释器、插件与模型目录。"""
    return env_ops.scan_root(path)


@eel.expose
def env_list_dir(path, exts=None, recursive=True):
    return fs_ops.list_dir(path, exts, recursive)


@eel.expose
def env_exists(path):
    return fs_ops.exists(path)


# ---------------------------------------------------------------- 原生文件/目录选择

@eel.expose
def dialog_pick_file(title="选择文件", filetypes=None):
    """弹出系统原生文件选择框，返回真实绝对路径（取消返回 None）。"""
    return run_on_main(lambda: _tk_pick("file", title, filetypes, multiple=False))


@eel.expose
def dialog_pick_dir(title="选择目录"):
    """弹出系统原生目录选择框，返回真实绝对路径（取消返回 None）。"""
    return run_on_main(lambda: _tk_pick("dir", title, None, multiple=False))


def _tk_pick(kind, title, filetypes, multiple):
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": "无法打开系统选择框：{}".format(e), "log": []}

    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        if kind == "dir":
            path = filedialog.askdirectory(title=title)
            paths = [path] if path else []
        else:
            ft = [tuple(x) for x in (filetypes or [])] or [("所有文件", "*.*")]
            if multiple:
                paths = list(filedialog.askopenfilenames(title=title, filetypes=ft))
            else:
                one = filedialog.askopenfilename(title=title, filetypes=ft)
                paths = [one] if one else []
            paths = [p for p in paths if p]
        root.destroy()
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": "选择框异常：{}".format(e), "log": []}

    if not paths:
        return {"ok": False, "error": "cancelled", "log": []}
    return {"ok": True, "data": {"paths": paths, "path": paths[0]}, "log": []}


# ---------------------------------------------------------------- 内核 / Git

@eel.expose
def kernel_list_versions(repo):
    return git_ops.list_versions(repo)


@eel.expose
def kernel_current_version(repo):
    return git_ops.current_version(repo)


@eel.expose
def kernel_set_remote(repo, url):
    return git_ops.set_remote(repo, url)


@eel.expose
def kernel_checkout(repo, ref):
    return git_ops.checkout(repo, ref)


@eel.expose
def kernel_clone(url, dest, name=None):
    return git_ops.clone(url, dest, name)


# ---------------------------------------------------------------- 插件

@eel.expose
def plugins_list(comfy_root):
    return plugin_ops.list_plugins(comfy_root)


@eel.expose
def plugin_set_enabled(comfy_root, plugin, enabled):
    return plugin_ops.set_enabled(comfy_root, plugin, enabled)


@eel.expose
def plugin_uninstall(comfy_root, plugin):
    return plugin_ops.uninstall(comfy_root, plugin)


@eel.expose
def plugin_update(comfy_root, plugin):
    return plugin_ops.update(comfy_root, plugin)


@eel.expose
def plugin_rollback(comfy_root, plugin):
    return plugin_ops.rollback(comfy_root, plugin)


@eel.expose
def plugin_install_deps(comfy_root, plugin, python=None, index_url=None):
    return plugin_ops.install_deps(comfy_root, plugin, python, index_url)


# ---------------------------------------------------------------- pip

@eel.expose
def pip_install(python, packages, index_url=None, upgrade=False):
    return pip_ops.install(python, packages, index_url, upgrade)


@eel.expose
def pip_uninstall(python, packages):
    return pip_ops.uninstall(python, packages)


@eel.expose
def pip_freeze(python, out_file=None):
    return pip_ops.freeze(python, out_file)


@eel.expose
def pip_preview_snapshot(python, target_text):
    """读取当前环境真实依赖，与快照文本比对出差异。"""
    fr = pip_ops.freeze(python)
    if not fr["ok"]:
        return fr
    current = fr["data"].get("text", "")
    diff = compare_requirements(current, target_text or "")
    return {"ok": True, "data": diff, "log": ["已读取当前环境依赖并与快照比对完成"]}


@eel.expose
def pip_restore_snapshot(python, added, removed, changed, index_url=None):
    return pip_ops.restore_snapshot(python, added, removed, changed, index_url)


# ---------------------------------------------------------------- ffmpeg

@eel.expose
def ffmpeg_probe():
    return ffmpeg_ops.probe()


@eel.expose
def ffmpeg_ensure():
    return ffmpeg_ops.ensure()


@eel.expose
def ffmpeg_transcode(src, dst, vcodec="libx264", acodec="aac", extra=None):
    return ffmpeg_ops.transcode(src, dst, vcodec, acodec, extra)


@eel.expose
def ffmpeg_extract_frames(src, out_dir, fps=1, pattern="frame_%05d.png"):
    return ffmpeg_ops.extract_frames(src, out_dir, fps, pattern)


@eel.expose
def ffmpeg_compress(src, dst, crf=28, scale=None):
    return ffmpeg_ops.compress(src, dst, crf, scale)


# ---------------------------------------------------------------- 文件

@eel.expose
def fs_delete(paths, root=None, use_trash=True):
    return fs_ops.remove_paths(paths, root, use_trash)


# ---------------------------------------------------------------- 启动

@eel.expose
def launch_start(comfy_root, python=None, port=8188, extra_args=None):
    return launch_ops.start(comfy_root, python, port, extra_args)


@eel.expose
def launch_status(task_id=None):
    return launch_ops.status(task_id)


@eel.expose
def launch_stop(task_id=None):
    return launch_ops.stop(task_id)


@eel.expose
def launch_open_browser(port=8188):
    return launch_ops.open_browser(port)


# ---------------------------------------------------------------- 主流程

def _prewarm_ffmpeg():
    """后台预热 ffmpeg：若缺失则静默安装，用户无感。"""
    try:
        ffmpeg_ops.ensure()
    except Exception:  # noqa: BLE001
        pass


def main():
    if not os.path.isdir(WEB_DIR):
        print("[backend] 未找到前端产物目录：{}".format(WEB_DIR))
        print("[backend] 请先执行 npm run build 生成 dist 后再启动。")
        return 1

    _inject_eel_js()

    threading.Thread(target=_prewarm_ffmpeg, daemon=True).start()

    port = 0
    try:
        eel.start("index.html", mode="chrome", size=(1440, 900), port=port, block=True)
    except (OSError, SystemExit):
        try:
            eel.start("index.html", mode="edge", size=(1440, 900), port=port, block=True)
        except (OSError, SystemExit):
            eel.start("index.html", mode="default", size=(1440, 900), port=port, block=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
