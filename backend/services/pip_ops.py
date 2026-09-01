"""
pip 依赖操作服务

覆盖：快照依赖恢复、包安装/卸载、依赖树查询、requirements 导出。
统一用 python -m pip 调用，避免 PATH 中 pip 指向错误解释器。
"""
import os

from .runner import run, which

TIMEOUT = 1800


def _pip_args(python, args, extra_env=None):
    """
    构造 pip 调用命令。
    优先用给定的 python 解释器；若该解释器无 pip，退化为系统 pip。
    """
    if python and os.path.exists(python):
        probe = run([python, "-m", "pip", "--version"], timeout=120)
        if probe["ok"]:
            return [python, "-m", "pip", *args]
    if which("pip"):
        return ["pip", *args]
    return [python or "python", "-m", "pip", *args]


def install(python, packages, index_url=None, upgrade=False):
    """安装包，返回 { ok, data, error, log }。"""
    pkgs = [p for p in (packages or []) if p and p.strip()]
    if not pkgs:
        return {"ok": False, "error": "未指定要安装的包", "log": []}

    args = ["install"]
    if upgrade:
        args.append("--upgrade")
    if index_url:
        args += ["-i", index_url]
    args += pkgs

    cmd = _pip_args(python, args)
    r = run(cmd, timeout=TIMEOUT)
    log = ["$ {}".format(" ".join(cmd)), r["out"], r["err"]]
    log = [x for x in log if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "安装失败", "log": log}
    return {"ok": True, "data": {"installed": pkgs}, "log": log}


def uninstall(python, packages):
    pkgs = [p for p in (packages or []) if p and p.strip()]
    if not pkgs:
        return {"ok": False, "error": "未指定要卸载的包", "log": []}
    cmd = _pip_args(python, ["uninstall", "-y", *pkgs])
    r = run(cmd, timeout=TIMEOUT)
    log = [x for x in ["$ {}".format(" ".join(cmd)), r["out"], r["err"]] if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "卸载失败", "log": log}
    return {"ok": True, "data": {"uninstalled": pkgs}, "log": log}


def freeze(python, out_file=None):
    """导出当前环境的依赖清单；out_file 非空时同时写入文件。"""
    cmd = _pip_args(python, ["freeze"])
    r = run(cmd, timeout=600)
    log = [x for x in ["$ {}".format(" ".join(cmd)), r["err"]] if x]
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "导出失败", "log": log}

    text = r["out"]
    if out_file:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(out_file)) or ".", exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(text + "\n")
            log.append("已写入：{}".format(out_file))
        except OSError as e:
            return {"ok": False, "error": "写入文件失败：{}".format(e), "log": log}

    return {"ok": True, "data": {"text": text, "file": out_file}, "log": log}


def restore_snapshot(python, added, removed, changed, index_url=None):
    """
    按差异恢复环境依赖：先卸载 removed，再安装 added/changed 的目标版本。
    返回 { ok, data, error, log }。
    """
    log = []
    done = []

    if removed:
        ur = uninstall(python, removed)
        log += ur.get("log", [])
        if not ur["ok"]:
            return {"ok": False, "error": ur.get("error", "卸载失败"), "log": log}
        done.append("已卸载 {} 个".format(len(removed)))

    targets = list(added or [])
    for c in changed or []:
        name = c.get("name")
        to = c.get("to")
        if not name:
            continue
        targets.append("{}{}".format(name, "==" + to if to and to != "未指定" else ""))

    if targets:
        ir = install(python, targets, index_url=index_url, upgrade=True)
        log += ir.get("log", [])
        if not ir["ok"]:
            return {"ok": False, "error": ir.get("error", "安装失败"), "log": log}
        done.append("已安装/更新 {} 个".format(len(targets)))

    if not done:
        return {"ok": True, "data": {}, "log": ["依赖无差异，无需恢复"]}
    return {"ok": True, "data": {"summary": "，".join(done)}, "log": log}
