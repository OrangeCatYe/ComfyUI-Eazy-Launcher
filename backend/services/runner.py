"""
统一子进程执行器

所有对外部命令（git / pip / python / ffmpeg）的调用都收敛到这里，
统一处理：超时、编码、Windows 下隐藏控制台窗口、错误归一化。
"""
import os
import shutil
import subprocess
import sys

IS_WIN = sys.platform == "win32"
CREATE_NO_WINDOW = 0x08000000 if IS_WIN else 0

DEFAULT_TIMEOUT = 1800


def _kwargs():
    kw = {
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
        "stdin": subprocess.DEVNULL,
        "text": True,
        "encoding": "utf-8",
        "errors": "replace",
    }
    if IS_WIN:
        kw["creationflags"] = CREATE_NO_WINDOW
    return kw


def which(cmd):
    """在系统 PATH 中查找命令，返回绝对路径或 None。"""
    return shutil.which(cmd)


def run(cmd, cwd=None, timeout=DEFAULT_TIMEOUT, env=None, shell=False):
    """
    执行一条命令并等待结束。

    返回 { ok, code, out, err, cmd }，永不抛异常。
    """
    if isinstance(cmd, (list, tuple)):
        cmd = [str(c) for c in cmd]
        text = " ".join(cmd)
    else:
        text = str(cmd)

    full = None
    if env:
        full = os.environ.copy()
        full.update(env)

    try:
        proc = subprocess.run(
            cmd, cwd=cwd, timeout=timeout, shell=shell, env=full, **_kwargs()
        )
        return {
            "ok": proc.returncode == 0,
            "code": proc.returncode,
            "out": (proc.stdout or "").strip(),
            "err": (proc.stderr or "").strip(),
            "cmd": text,
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": -1, "out": "", "err": "执行超时（超过 {} 秒）".format(timeout), "cmd": text}
    except FileNotFoundError:
        return {"ok": False, "code": -2, "out": "", "err": "命令不存在：{}".format(text), "cmd": text}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "code": -3, "out": "", "err": "{}: {}".format(type(e).__name__, e), "cmd": text}
