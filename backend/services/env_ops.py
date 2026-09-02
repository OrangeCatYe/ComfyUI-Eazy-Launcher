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


# 通用扫描时跳过的重目录：模型/输出/缓存目录文件数巨大，翻它们毫无意义
_SCAN_SKIP = {
    "models", "output", "temp", "input", "user", ".git", "__pycache__",
    "custom_nodes", "node_modules", "comfy_extras", "comfy", "web",
    "tests", "tests-unit", ".ci", ".github", "venv_cache", "pip_cache",
}

# 通用扫描的目录深度上限（根目录 0 层起算）
_SCAN_MAX_DEPTH = 3


def _scan_python_exe(base_dir, max_depth=_SCAN_MAX_DEPTH):
    """
    在 base_dir 下有限深度广度优先搜索 python.exe（Windows）。

    返回绝对路径或 None。只找「环境形态」的命中：
    - 顶层（0-1 层）：直接命中即可（python_embeded\\python.exe 这类）
    - 更深层：要求目录名含 python/venv/env 字样，避免误报
    广度优先保证「浅而标准」的路径先于「深而奇怪」的路径被发现。
    """
    if not os.path.isdir(base_dir):
        return None
    is_win = sys.platform == "win32"
    # 非 Windows 只找 python3/-python 可执行文件
    exe_names = {"python.exe"} if is_win else {"python", "python3"}
    queue = [(base_dir, 0)]
    while queue:
        cur, depth = queue.pop(0)
        try:
            entries = sorted(os.listdir(cur))
        except OSError:
            continue
        # 当前目录直接命中（0 层的 base_dir 本身也可能是环境根）
        for name in sorted(exe_names):
            p = os.path.join(cur, name)
            if os.path.isfile(p):
                return p
        if depth >= max_depth:
            continue
        for name in entries:
            child = os.path.join(cur, name)
            if not os.path.isdir(child) or name in _SCAN_SKIP or name.startswith((".", "__")):
                continue
            # 深层目录必须「长得像环境目录」才继续搜，避免全树乱翻
            low = name.lower()
            if depth >= 1 and not any(k in low for k in ("python", "venv", "env", "runtime")):
                continue
            queue.append((child, depth + 1))
    return None


def _system_python():
    """系统 PATH 中的 Python（where/which），找不到返回 None。"""
    if sys.platform == "win32":
        r = run(["where", "python"], timeout=15)
        if r["ok"]:
            for line in r["out"].splitlines():
                line = line.strip()
                if line.lower().endswith("python.exe") and os.path.isfile(line):
                    return line
    else:
        r = run(["which", "python3"], timeout=15)
        if r["ok"]:
            line = r["out"].splitlines()[0].strip() if r["out"].splitlines() else ""
            if line and os.path.isfile(line):
                return line
    return None


def _detect_python(comfy_root):
    """
    解释器探测核心，返回 (path, source) 或 (None, reason)。

    优先级：
      1. 专用环境：根目录 .venv/venv，上级 standalone-env/python_embeded/python.exe
      2. 通用扫描：根目录与上级目录内有限深度搜索 python.exe
      3. 系统 Python（PATH）—— 标注 source=system，
         调用方应提醒用户它可能缺少 ComfyUI 依赖
    """
    if not comfy_root or not os.path.isdir(comfy_root):
        return None, "no_root"

    # 1. 专用环境（历史命名，命中率最高）
    for rel, src in (
        (os.path.join(".venv", "Scripts", "python.exe"), "venv"),
        (os.path.join(".venv", "bin", "python"), "venv"),
        (os.path.join("venv", "Scripts", "python.exe"), "venv"),
        (os.path.join("venv", "bin", "python"), "venv"),
    ):
        p = os.path.join(comfy_root, rel)
        if os.path.exists(p):
            return p, src

    parent = os.path.dirname(comfy_root)
    for rel, src in (
        (os.path.join("standalone-env", "python.exe"), "standalone"),
        (os.path.join("python_embeded", "python.exe"), "embedded"),
    ):
        p = os.path.join(parent, rel)
        if os.path.exists(p):
            return p, src

    # 2. 通用扫描：先上级后根目录？
    #    否 —— 根目录自带的（.venv 之外的裸 python.exe）比上级更贴近项目，
    #    但上级的 python_embeded 语义上更「专用」。综合：先扫根目录，
    #    再扫上级，因为根目录命中意味着环境与项目直接绑定。
    p = _scan_python_exe(comfy_root)
    if p:
        return p, "scan"
    if parent and parent != comfy_root:
        p = _scan_python_exe(parent, max_depth=2)
        if p:
            return p, "scan"

    # 3. 系统 Python 兜底
    p = _system_python()
    if p:
        return p, "system"

    return None, "not_found"


def _python_of(comfy_root):
    """
    按优先级推断 ComfyUI 使用的 Python 解释器，返回绝对路径。

    探测顺序：专用环境 → 通用扫描（根目录+上级目录的 python.exe）→
    系统 Python（PATH）。全部落空才抛 PythonNotFoundError。
    """
    p, src = _detect_python(comfy_root)
    if p:
        return p
    if src == "no_root":
        raise PythonNotFoundError("未配置 ComfyUI 根目录，无法确定 Python 解释器")
    raise PythonNotFoundError(
        "未找到可用的 Python 解释器：{} 及其上级目录中没有 python.exe，系统 PATH 中也没有 python。"
        "请在「全局设置 → 软件设置 → 主 Python」中手动指定解释器路径。".format(comfy_root)
    )


def _ask_python(python, code, timeout=120):
    return run([python, "-c", code], timeout=timeout)


# torch 版本缓存：key=解释器路径。版本号在环境不变时不会变，
# 缓存后重复刷新不再每次 import torch（5~15 秒）。
_TORCH_CACHE = {}

# GPU 型号与显存缓存：key=解释器路径。nvidia-smi 查询本身是毫秒级，
# 缓存 10 秒避免连续点击刷新时重复查询。
_GPU_CACHE = {"ts": 0.0, "key": None, "gpu": "", "vram": ""}
_GPU_CACHE_TTL = 10.0


def _gpu_via_nvidia_smi():
    """
    用 nvidia-smi 拿 GPU 型号与显存（毫秒级，不加载 torch）。

    返回 (gpuName, vramUsage)。驱动存在时几乎必成功；
    无 NVIDIA 显卡/驱动时返回 ("", "")。
    """
    if sys.platform == "win32":
        exe = "nvidia-smi"
    else:
        exe = "nvidia-smi"
    r = run(
        [exe, "--query-gpu=name,memory.used,memory.total",
         "--format=csv,noheader,nounits"],
        timeout=15,
    )
    if not r["ok"]:
        return "", ""
    line = (r["out"] or "").splitlines()[0].strip() if r["out"] else ""
    if not line:
        return "", ""
    parts = [x.strip() for x in line.split(",")]
    if len(parts) < 3:
        return parts[0] if parts else "", ""
    name, used, total = parts[0], parts[1], parts[2]
    try:
        used_f, total_f = float(used), float(total)
        pct = (used_f / total_f * 100) if total_f > 0 else 0
        vram = "{:.1f}/{:.1f} GB (已用 {:.0f}%)".format(
            used_f / 1024, total_f / 1024, pct
        )
    except ValueError:
        vram = ""
    return name, vram


def detect(comfy_root=None):
    """
    一次性探测全套环境信息。
    返回 { data:{ pythonVersion, torchVersion, gpuName, vramUsage, gitVersion, pythonPath, ... } }

    性能策略：
      - GPU 型号/显存走 nvidia-smi（毫秒级），不再用 torch 查询
      - torch 版本按解释器路径缓存（环境不变则命中，刷新秒回）
      - Python 版本、torch 版本、git 版本三路并行，总耗时≈最慢一路
    """
    import concurrent.futures as _fut

    try:
        python = _python_of(comfy_root)
    except PythonNotFoundError:
        python = ""

    # 并行任务 1：Python 版本
    def _pyver():
        if not python:
            return ""
        pv = _ask_python(python, "import sys;print('{}.{}.{}'.format(*sys.version_info[:3]))")
        return pv["out"].splitlines()[-1].strip() if pv["ok"] else ""

    # 并行任务 2：torch 版本（带缓存）
    def _torchver():
        if not python:
            return ""
        cached = _TORCH_CACHE.get(python)
        if cached:
            return cached
        t = _ask_python(
            python,
            "import torch;print(torch.__version__)",
            timeout=300,
        )
        v = t["out"].splitlines()[-1].strip() if t["ok"] and t["out"] else ""
        if v:
            _TORCH_CACHE[python] = v
        return v

    # 并行任务 3：GPU 型号 + 显存（nvidia-smi，10 秒缓存）
    def _gpu():
        import time as _time
        now = _time.time()
        if _GPU_CACHE["key"] == python and now - _GPU_CACHE["ts"] < _GPU_CACHE_TTL:
            return _GPU_CACHE["gpu"], _GPU_CACHE["vram"]
        gpu, vram = _gpu_via_nvidia_smi()
        _GPU_CACHE.update({"ts": now, "key": python, "gpu": gpu, "vram": vram})
        return gpu, vram

    # 并行任务 4：git 版本
    def _gitver():
        gr = run(["git", "--version"], timeout=60)
        return gr["out"].strip() if gr["ok"] else ""

    try:
        with _fut.ThreadPoolExecutor(max_workers=4) as pool:
            f_py = pool.submit(_pyver)
            f_torch = pool.submit(_torchver)
            f_gpu = pool.submit(_gpu)
            f_git = pool.submit(_gitver)
            python_version = f_py.result()
            torch_version = f_torch.result()
            gpu_name, vram = f_gpu.result()
            git_version = f_git.result()
    except Exception:  # noqa: BLE001 —— 并行框架异常时退回串行
        python_version = _pyver()
        torch_version = _torchver()
        gpu_name, vram = _gpu()
        git_version = _gitver()

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
    return _detect_python(comfy_root)


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
