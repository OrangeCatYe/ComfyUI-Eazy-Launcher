"""
ffmpeg 服务 —— 用户无感的自动安装策略

优先级（用户全程无需干预，界面上只看到"转码中"）：
  1. ComfyUI 整合包内置的 ffmpeg（imageio_ffmpeg / 常见目录）
  2. 系统 PATH 中的 ffmpeg
  3. 静默 pip 安装 imageio-ffmpeg（后台进行，前端可轮询进度）
  4. 失败才返回明确错误

对外只暴露 ensure() / probe() / transcode() / extract_frames() / compress()，
安装细节完全内聚在本模块。
"""
import glob
import os
import sys
import threading

from .runner import run

# 安装状态：idle / installing / ready / failed
_state = {"status": "idle", "path": "", "error": "", "source": ""}
_lock = threading.Lock()


def _candidates():
    """按优先级枚举可能的 ffmpeg 路径。"""
    out = []

    try:
        import imageio_ffmpeg  # type: ignore
        p = imageio_ffmpeg.get_ffmpeg_exe()
        if p and os.path.exists(p):
            out.append((p, "imageio-ffmpeg（内置）"))
    except Exception:  # noqa: BLE001
        pass

    exe = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
    which_path = _shutil_which(exe)
    if which_path:
        out.append((which_path, "系统 PATH"))

    for pat in (
        os.path.join(os.path.dirname(sys.executable), exe),
        os.path.join(os.path.dirname(sys.executable), "Scripts", exe),
        os.path.join(os.path.dirname(sys.executable), "bin", exe),
    ):
        if os.path.exists(pat):
            out.append((pat, "Python 环境"))

    return out


def _shutil_which(cmd):
    import shutil
    return shutil.which(cmd)


def _scan_wellknown():
    """扫描常见安装位置（Windows 主用）。"""
    exe = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
    roots = []
    if sys.platform == "win32":
        for drv in ("C:", "D:", "E:", "F:"):
            roots += [
                os.path.join(drv, os.sep, "ffmpeg", "bin", exe),
                os.path.join(drv, os.sep, "ffmpeg-*", "bin", exe),
            ]
        local = os.environ.get("LOCALAPPDATA", "")
        if local:
            roots.append(os.path.join(local, "Programs", "ffmpeg", "bin", exe))
    else:
        roots += ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]

    for r in roots:
        for hit in glob.glob(r):
            if os.path.exists(hit):
                return hit, "常见安装位置"
    return None, None


def probe():
    """返回当前 ffmpeg 状态，不触发安装。"""
    with _lock:
        if _state["status"] == "ready" and os.path.exists(_state["path"]):
            return {"ok": True, "data": dict(_state)}

    for path, source in _candidates():
        if path and os.path.exists(path):
            with _lock:
                _state.update(status="ready", path=path, source=source, error="")
            return {"ok": True, "data": dict(_state)}

    path, source = _scan_wellknown()
    if path:
        with _lock:
            _state.update(status="ready", path=path, source=source, error="")
        return {"ok": True, "data": dict(_state)}

    with _lock:
        _state.update(status="idle", path="", source="", error="")
    return {"ok": True, "data": dict(_state)}


def _install_bg():
    """后台静默安装 imageio-ffmpeg。"""
    try:
        r = run([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"], timeout=900)
        if not r["ok"]:
            with _lock:
                _state.update(status="failed", error=r["err"] or "安装失败")
            return
        import importlib
        importlib.invalidate_caches()
        import imageio_ffmpeg  # type: ignore
        p = imageio_ffmpeg.get_ffmpeg_exe()
        with _lock:
            if p and os.path.exists(p):
                _state.update(status="ready", path=p, source="imageio-ffmpeg（自动安装）", error="")
            else:
                _state.update(status="failed", error="安装完成但未找到可执行文件")
    except Exception as e:  # noqa: BLE001
        with _lock:
            _state.update(status="failed", error="{}: {}".format(type(e).__name__, e))


def ensure():
    """
    确保 ffmpeg 可用；不可用则后台静默安装。

    返回 { ok, data:{status,path,source,error} }：
      - status=ready  -> 可直接使用
      - status=installing -> 正在后台安装，前端应轮询 probe()
      - status=failed -> 安装失败，返回错误
    """
    cur = probe()
    if cur["data"].get("status") == "ready":
        return {"ok": True, "data": cur["data"]}

    with _lock:
        if _state["status"] == "failed":
            return {"ok": False, "error": _state["error"] or "ffmpeg 不可用", "data": dict(_state)}
        if _state["status"] != "installing":
            _state.update(status="installing", error="")
            threading.Thread(target=_install_bg, daemon=True).start()

    return {"ok": True, "data": dict(_state), "error": ""}


def _exe():
    st = probe()["data"]
    return st["path"] if st.get("status") == "ready" else None


def _require():
    exe = _exe()
    if exe:
        return exe, None
    st = ensure()
    if st.get("ok") and st["data"].get("status") == "installing":
        return None, {"ok": False, "error": "ffmpeg 正在后台自动安装，请稍候重试（约 1-2 分钟）", "data": st["data"]}
    return None, {"ok": False, "error": st.get("error") or "ffmpeg 不可用", "data": st.get("data", {})}


def transcode(src, dst, vcodec="libx264", acodec="aac", extra=None):
    """音视频转码 / 格式转换。"""
    exe, err = _require()
    if err:
        return err
    cmd = [exe, "-y", "-i", src]
    cmd += list(extra or [])
    cmd += ["-c:v", vcodec, "-c:a", acodec, dst]
    r = run(cmd, timeout=3600)
    log = [x for x in ["$ ffmpeg 转码", r["err"], r["out"]] if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "转码失败", "log": log}
    return {"ok": True, "data": {"dst": dst}, "log": log}


def extract_frames(src, out_dir, fps=1, pattern="frame_%05d.png"):
    """按帧率抽帧输出图片序列。"""
    exe, err = _require()
    if err:
        return err
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, pattern)
    cmd = [exe, "-y", "-i", src, "-vf", "fps={}".format(fps), out]
    r = run(cmd, timeout=3600)
    log = [x for x in ["$ ffmpeg 抽帧", r["err"]] if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "抽帧失败", "log": log}
    return {"ok": True, "data": {"dir": out_dir}, "log": log}


def compress(src, dst, crf=28, scale=None):
    """压缩视频（CRF 质量 + 可选缩放）。"""
    exe, err = _require()
    if err:
        return err
    cmd = [exe, "-y", "-i", src, "-c:v", "libx264", "-crf", str(crf), "-preset", "medium"]
    if scale:
        cmd += ["-vf", "scale={}".format(scale)]
    cmd += ["-c:a", "aac", "-b:a", "128k", dst]
    r = run(cmd, timeout=3600)
    log = [x for x in ["$ ffmpeg 压缩", r["err"]] if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "压缩失败", "log": log}
    return {"ok": True, "data": {"dst": dst}, "log": log}
