"""
文件系统操作服务

覆盖：文件删除（回收站优先，失败退化为永久删除）、目录列举、路径校验。
所有删除均要求路径位于允许的 ComfyUI 根目录内，避免误删。
"""
import os
import shutil

try:
    from send2trash import send2trash  # type: ignore
except Exception:  # noqa: BLE001
    send2trash = None


def _norm(p):
    return os.path.normcase(os.path.normpath(os.path.abspath(p)))


def is_within(child, parent):
    """判断 child 是否位于 parent 目录内（或就是 parent）。"""
    if not child or not parent:
        return False
    c, p = _norm(child), _norm(parent)
    return c == p or c.startswith(p + os.sep)


def remove_paths(paths, root=None, use_trash=True):
    """
    批量删除文件/目录。

    返回 { ok, data:{deleted:[], failed:[{path,error}]}, log }。
    root 非空时，只删除位于 root 内的路径，其余记为失败。
    """
    deleted, failed, log = [], [], []

    for raw in paths or []:
        if not raw:
            continue
        p = _norm(raw)
        if root and not is_within(p, root):
            failed.append({"path": raw, "error": "路径不在允许的目录内，已拒绝删除"})
            continue
        if not os.path.exists(p):
            failed.append({"path": raw, "error": "路径不存在"})
            continue

        try:
            if use_trash and send2trash is not None:
                send2trash(p)
                log.append("已移入回收站：{}".format(raw))
            elif os.path.isdir(p):
                shutil.rmtree(p)
                log.append("已删除目录：{}".format(raw))
            else:
                os.remove(p)
                log.append("已删除文件：{}".format(raw))
            deleted.append(raw)
        except Exception as e:  # noqa: BLE001
            failed.append({"path": raw, "error": "{}: {}".format(type(e).__name__, e)})

    if failed and not deleted:
        return {"ok": False, "data": {"deleted": deleted, "failed": failed}, "error": "全部删除失败", "log": log}
    return {"ok": True, "data": {"deleted": deleted, "failed": failed}, "log": log}


def list_dir(path, exts=None, recursive=True):
    """列举目录下符合后缀的文件，返回 {name, path, size}。"""
    if not path or not os.path.isdir(path):
        return {"ok": False, "error": "目录不存在：{}".format(path), "log": []}

    allow = None
    if exts:
        allow = tuple(e.lower() if e.startswith(".") else "." + e.lower() for e in exts)

    files = []
    if recursive:
        for dirpath, _, names in os.walk(path):
            for n in names:
                if allow and not n.lower().endswith(allow):
                    continue
                full = os.path.join(dirpath, n)
                try:
                    size = os.path.getsize(full)
                except OSError:
                    size = 0
                files.append({"name": n, "path": full, "size": size})
    else:
        for n in os.listdir(path):
            full = os.path.join(path, n)
            if not os.path.isfile(full):
                continue
            if allow and not n.lower().endswith(allow):
                continue
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            files.append({"name": n, "path": full, "size": size})

    files.sort(key=lambda x: x["path"])
    return {"ok": True, "data": {"dir": path, "files": files}, "log": ["共读取到 {} 个文件".format(len(files))]}


def exists(path):
    return {"ok": True, "data": {"exists": bool(path) and os.path.exists(path)}, "log": []}


READ_TEXT_MAX_BYTES = 2 * 1024 * 1024  # 2MB：requirements/配置类文本足够，防止误读大文件


def read_text(path, encoding="utf-8"):
    """读取文本文件内容，返回 {ok, data:{text, path}, log}。"""
    if not path or not os.path.isfile(path):
        return {"ok": False, "error": "文件不存在：{}".format(path), "log": []}
    try:
        if os.path.getsize(path) > READ_TEXT_MAX_BYTES:
            return {"ok": False, "error": "文件过大（>2MB），拒绝读取：{}".format(path), "log": []}
        # utf-8-sig 兼容 BOM；回退 GBK 兼容 Windows 记事本
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                text = f.read()
        except UnicodeDecodeError:
            with open(path, "r", encoding="gbk", errors="replace") as f:
                text = f.read()
        return {"ok": True, "data": {"text": text, "path": path}, "log": []}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": "{}: {}".format(type(e).__name__, e), "log": []}
