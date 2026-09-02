"""
运行环境检测服务

覆盖：Python 版本、Pytorch 版本、Git 版本、GPU 型号与显存、ComfyUI 目录校验。
所有数值均来自真实探测，探测不到返回空字符串（由前端显示"未获取"）。
"""
import os
import sys

from .runner import run, which

MARKERS = ("main.py", "nodes.py", "execution.py")


class PythonNotFoundError(Exception):
    """无法确定 ComfyUI 使用的 Python 解释器时抛出。"""


def _python_of(comfy_root):
    """
    按优先级推断 ComfyUI 使用的 Python 解释器。

    找不到 venv / 独立环境时抛出 PythonNotFoundError，
    绝不静默回退到系统 Python —— 系统 Python 几乎必然缺少
    ComfyUI 依赖（sqlalchemy/torch 等），硬跑只会得到一条
    难以理解的 ModuleNotFoundError 崩溃栈。
    """
    if not comfy_root:
        raise PythonNotFoundError("未配置 ComfyUI 根目录，无法确定 Python 解释器")
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
    raise PythonNotFoundError(
        "未找到可用的 Python 解释器：{} 及其上级目录中没有 .venv / venv / standalone-env / python_embeded。"
        "请在「全局设置 → 软件设置 → 主 Python」中手动指定解释器路径。".format(comfy_root)
    )


def _ask_python(python, code, timeout=120):
    return run([python, "-c", code], timeout=timeout)


def detect(comfy_root=None):
    """
    一次性探测全套环境信息。
    返回 { data:{ pythonVersion, torchVersion, gpuName, vramUsage, gitVersion, pythonPath, ... } }
    """
    try:
        python = _python_of(comfy_root)
    except PythonNotFoundError:
        python = ""

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


# ---------------------------------------------------------------- 目录扫描

SCAN_MARKERS = ("main.py", "nodes.py", "execution.py", "comfy", "custom_nodes")
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "output", "temp", "input", ".svn"}


def _score_dir(path):
    """给目录打 ComfyUI 特征分（0-5）。"""
    try:
        names = set(os.listdir(path))
    except OSError:
        return 0, set(), set()
    files, dirs = set(), set()
    for n in names:
        (dirs if os.path.isdir(os.path.join(path, n)) else files).add(n)
    score = sum(1 for m in SCAN_MARKERS if m in files or m in dirs)
    return score, files, dirs


def _child_dirs(path):
    try:
        return sorted(
            d for d in os.listdir(path)
            if d not in SKIP_DIRS
            and not d.startswith(".")
            and not d.startswith("__")
            and os.path.isdir(os.path.join(path, d))
        )
    except OSError:
        return []


def _find_comfy_root(root, max_depth=3):
    """从 root 向下最多找 max_depth 层，返回特征分最高的目录（绝对路径）。"""
    best, best_score = root, _score_dir(root)[0]
    if best_score >= 3:
        return best, best_score, False

    stack = [(root, 0)]
    while stack:
        cur, depth = stack.pop()
        if depth >= max_depth:
            continue
        for name in _child_dirs(cur):
            cand = os.path.join(cur, name)
            s = _score_dir(cand)[0]
            if s > best_score:
                best, best_score = cand, s
            if best_score >= 3:
                return best, best_score, best != root
            stack.append((cand, depth + 1))
    return best, best_score, best != root


def _find_python(comfy_root):
    """识别 Python 解释器绝对路径，返回 (path, source)。"""
    for rel, src in (
        (os.path.join(".venv", "Scripts", "python.exe"), "venv"),
        (os.path.join(".venv", "bin", "python"), "venv"),
        (os.path.join("venv", "Scripts", "python.exe"), "venv"),
        (os.path.join("venv", "bin", "python"), "venv"),
    ):
        p = os.path.join(comfy_root, rel)
        if os.path.exists(p):
            return p, src

    parent = os.path.dirname(comfy_root) or comfy_root
    for rel, src in (
        (os.path.join("standalone-env", "python.exe"), "standalone"),
        (os.path.join("python_embeded", "python.exe"), "embedded"),
        ("python.exe", "system"),
    ):
        p = os.path.join(parent, rel)
        if os.path.exists(p):
            return p, src
    return "", ""


def scan_root(path):
    """
    真实扫描一个绝对路径（后端执行，拿到的是真实盘符路径）。

    与前端 File System Access API 的结果结构保持一致，
    这样上层 UI 无需区分来源。
    """
    if not path or not os.path.isdir(path):
        return {"ok": False, "error": "目录不存在：{}".format(path), "log": []}

    comfy_root, score, nested = _find_comfy_root(path)
    if score < 3:
        return {
            "ok": False,
            "error": "未在该目录中识别到 ComfyUI 内核特征（main.py / nodes.py / custom_nodes 等）",
            "log": [],
            "data": {"rootName": os.path.basename(path.rstrip("\\/")) or path, "comfyRoot": path},
        }

    plugins = _child_dirs(os.path.join(comfy_root, "custom_nodes"))
    models = _child_dirs(os.path.join(comfy_root, "models"))
    python_path, python_source = _find_python(comfy_root)

    req_path = os.path.join(comfy_root, "requirements.txt")
    requirements = None
    if os.path.isfile(req_path):
        try:
            with open(req_path, "r", encoding="utf-8", errors="replace") as f:
                requirements = f.read()
        except OSError:
            requirements = None

    return {
        "ok": True,
        "error": "",
        "log": [],
        "data": {
            "mode": "backend",
            "rootName": os.path.basename(path.rstrip("\\/")) or path,
            "comfyRoot": comfy_root,
            "nested": nested,
            "pythonPath": python_path,
            "pythonSource": python_source,
            "hasGit": os.path.isdir(os.path.join(comfy_root, ".git")),
            "pluginCount": len(plugins),
            "plugins": plugins,
            "modelsDirs": models,
            "requirements": requirements,
        },
    }
