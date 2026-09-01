"""
运行环境检测服务

覆盖：Python 版本、Pytorch 版本、Git 版本、GPU 型号与显存、ComfyUI 目录校验。
所有数值均来自真实探测，探测不到返回空字符串（由前端显示"未获取"）。
"""
import os
import sys

from .runner import run, which

MARKERS = ("main.py", "nodes.py", "execution.py")


def _python_of(comfy_root):
    """按优先级推断 ComfyUI 使用的 Python 解释器。"""
    if not comfy_root:
        return sys.executable
    for rel in (
        os.path.join(".venv", "Scripts", "python.exe"),
        os.path.join(".venv", "bin", "python"),
        os.path.join("venv", "Scripts", "python.exe"),
        os.path.join("venv", "bin", "python"),
    ):
        p = os.path.join(comfy_root, rel)
        if os.path.exists(p):
            return p

    parent = os.path.dirname(comfy_root)
    for rel in (
        os.path.join("standalone-env", "python.exe"),
        os.path.join("python_embeded", "python.exe"),
        "python.exe",
    ):
        p = os.path.join(parent, rel)
        if os.path.exists(p):
            return p
    return sys.executable


def _ask_python(python, code, timeout=120):
    return run([python, "-c", code], timeout=timeout)


def detect(comfy_root=None):
    """
    一次性探测全套环境信息。
    返回 { data:{ pythonVersion, torchVersion, gpuName, vramUsage, gitVersion, pythonPath, ... } }
    """
    python = _python_of(comfy_root)

    pv = _ask_python(python, "import sys;print('{}.{}.{}'.format(*sys.version_info[:3]))")
    python_version = pv["out"].splitlines()[-1].strip() if pv["ok"] else ""

    torch = _ask_python(
        python,
        "import torch;print(torch.__version__);"
        "print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')",
        timeout=300,
    )
    torch_version, gpu_name = "", ""
    if torch["ok"]:
        lines = [x for x in torch["out"].splitlines() if x.strip()]
        torch_version = lines[0].strip() if lines else ""
        gpu_name = lines[1].strip() if len(lines) > 1 else ""

    vram = ""
    if gpu_name:
        vr = _ask_python(
            python,
            "import torch;"
            "free,total=torch.cuda.mem_get_info();"
            "print('{:.1f}/{:.1f} GB (已用 {:.0f}%)'.format("
            "(total-free)/1024**3, total/1024**3, (total-free)/total*100))",
            timeout=300,
        )
        if vr["ok"]:
            vram = vr["out"].splitlines()[-1].strip()

    gr = run(["git", "--version"], timeout=60)
    git_version = gr["out"].strip() if gr["ok"] else ""

    return {
        "ok": True,
        "data": {
            "pythonPath": python,
            "pythonVersion": python_version,
            "torchVersion": torch_version,
            "gpuName": gpu_name,
            "vramUsage": vram,
            "gitVersion": git_version,
            "hasGit": bool(which("git")),
            "detailed": True,
        },
        "log": [],
    }


def validate_root(path):
    """校验 ComfyUI 根目录：命中特征文件即视为有效。"""
    if not path or not os.path.isdir(path):
        return {"ok": False, "error": "目录不存在：{}".format(path), "log": []}
    found = [m for m in MARKERS if os.path.exists(os.path.join(path, m))]
    return {
        "ok": bool(found),
        "data": {"path": path, "markers": found, "customNodes": os.path.isdir(os.path.join(path, "custom_nodes"))},
        "error": "" if found else "未找到 ComfyUI 特征文件（main.py / nodes.py / execution.py）",
        "log": [],
    }
