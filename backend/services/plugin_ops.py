"""
插件管理服务

覆盖：列举插件、启用/停用（目录重命名）、卸载（删除目录）、
批量操作、依赖安装。
"""
import os

from . import git_ops, pip_ops
from .fs_ops import is_within, remove_paths

DISABLE_SUFFIX = ".disabled"


def _custom_nodes(comfy_root):
    return os.path.join(comfy_root, "custom_nodes")


def list_plugins(comfy_root):
    """列举 custom_nodes 下的插件及其启用状态。"""
    cn = _custom_nodes(comfy_root or "")
    if not comfy_root or not os.path.isdir(cn):
        return {"ok": False, "error": "插件目录不存在：{}".format(cn), "log": []}

    items = []
    for name in sorted(os.listdir(cn)):
        full = os.path.join(cn, name)
        if not os.path.isdir(full):
            continue
        disabled = name.endswith(DISABLE_SUFFIX)
        real = name[: -len(DISABLE_SUFFIX)] if disabled else name
        items.append({
            "name": real,
            "dirName": name,
            "path": full,
            "enabled": not disabled,
            "isRepo": os.path.isdir(os.path.join(full, ".git")),
        })
    return {"ok": True, "data": {"plugins": items, "count": len(items)}, "log": ["共读取到 {} 个插件".format(len(items))]}


def _resolve(comfy_root, plugin):
    cn = _custom_nodes(comfy_root)
    for cand in (
        os.path.join(cn, plugin),
        os.path.join(cn, plugin + DISABLE_SUFFIX),
    ):
        if os.path.exists(cand):
            return cand
    return None


def set_enabled(comfy_root, plugin, enabled):
    """启用/停用插件：通过目录重命名实现，可逆。"""
    path = _resolve(comfy_root, plugin)
    if not path:
        return {"ok": False, "error": "插件不存在：{}".format(plugin), "log": []}

    base = os.path.basename(path)
    cur_enabled = not base.endswith(DISABLE_SUFFIX)
    if cur_enabled == bool(enabled):
        return {"ok": True, "data": {"name": plugin, "enabled": cur_enabled}, "log": ["状态未变化，无需操作"]}

    target = base[: -len(DISABLE_SUFFIX)] if not enabled else base + DISABLE_SUFFIX
    dst = os.path.join(os.path.dirname(path), target)

    try:
        os.rename(path, dst)
    except OSError as e:
        return {"ok": False, "error": "{}: {}".format(type(e).__name__, e), "log": []}

    return {"ok": True, "data": {"name": plugin, "enabled": bool(enabled), "path": dst}, "log": ["已{}插件：{}".format("启用" if enabled else "停用", plugin)]}


def uninstall(comfy_root, plugin):
    """卸载插件：删除插件目录。"""
    path = _resolve(comfy_root, plugin)
    if not path:
        return {"ok": False, "error": "插件不存在：{}".format(plugin), "log": []}
    if not is_within(path, comfy_root):
        return {"ok": False, "error": "插件路径不在 ComfyUI 目录内，已拒绝删除", "log": []}
    r = remove_paths([path], root=comfy_root, use_trash=True)
    if not r["ok"]:
        return {"ok": False, "error": r.get("error", "卸载失败"), "log": r.get("log", [])}
    return {"ok": True, "data": {"name": plugin}, "log": r.get("log", [])}


def update(comfy_root, plugin):
    """更新插件：Git 仓库执行 pull，非仓库提示无法更新。"""
    path = _resolve(comfy_root, plugin)
    if not path:
        return {"ok": False, "error": "插件不存在：{}".format(plugin), "log": []}
    if not git_ops.is_repo(path):
        return {"ok": False, "error": "该插件不是 Git 仓库，无法自动更新（请手动覆盖）", "log": []}
    return git_ops.pull(path)


def rollback(comfy_root, plugin):
    """回滚插件到上一个提交。"""
    path = _resolve(comfy_root, plugin)
    if not path:
        return {"ok": False, "error": "插件不存在：{}".format(plugin), "log": []}
    return git_ops.rollback(path)


def install_deps(comfy_root, plugin, python=None, index_url=None):
    """安装插件依赖：读取插件目录下的 requirements.txt 后 pip install。"""
    path = _resolve(comfy_root, plugin)
    if not path:
        return {"ok": False, "error": "插件不存在：{}".format(plugin), "log": []}
    req = os.path.join(path, "requirements.txt")
    if not os.path.exists(req):
        return {"ok": True, "data": {}, "log": ["该插件没有 requirements.txt，无需安装依赖"]}

    try:
        py = python or _default_python(comfy_root)
    except RuntimeError as e:
        return {"ok": False, "error": str(e), "log": []}
    r = pip_ops.install(py, ["-r", req], index_url=index_url)
    r.setdefault("log", []).append("$ pip install -r {}".format(req))
    return r


def _default_python(comfy_root):
    from .env_ops import _python_of, PythonNotFoundError
    try:
        return _python_of(comfy_root)
    except PythonNotFoundError as e:
        raise RuntimeError(str(e))
