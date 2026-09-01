"""
Git 操作服务

服务两类场景：
  - 内核版本管理（拉取版本列表、切换仓库、切换版本、克隆）
  - 插件更新 / 回滚

统一返回 { ok, data, error, log }。
"""
import os

from .runner import run, which

TIMEOUT = 1800


def _git(repo, *args, timeout=TIMEOUT):
    return run(["git", *args], cwd=repo, timeout=timeout)


def _clean(lines):
    return [x for x in lines if x]


def available():
    return bool(which("git"))


def is_repo(path):
    return bool(path) and os.path.isdir(os.path.join(path, ".git"))


def version():
    r = run(["git", "--version"])
    return r["out"] if r["ok"] else ""


def list_versions(repo):
    """拉取远端标签后返回版本列表（新 → 旧）。"""
    if not available():
        return {"ok": False, "error": "未检测到 git，请先安装 Git 并加入 PATH", "log": []}
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}

    log = ["$ git fetch --tags --force"]
    fr = _git(repo, "fetch", "--tags", "--force", timeout=300)
    log += _clean([fr["out"], fr["err"] if not fr["ok"] else ""])

    tr = _git(repo, "tag", "--sort=-v:refname")
    if not tr["ok"]:
        return {"ok": False, "error": tr["err"] or "读取版本列表失败", "log": log}

    tags = [t.strip() for t in tr["out"].splitlines() if t.strip()]
    log.append("共读取到 {} 个版本标签".format(len(tags)))
    return {"ok": True, "data": {"versions": tags}, "log": log}


def current_version(repo):
    """返回当前所在版本（describe）与分支名。"""
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}
    r = _git(repo, "describe", "--tags", "--always")
    cr = _git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    return {"ok": True, "data": {"version": r["out"], "branch": cr["out"]}, "log": []}


def set_remote(repo, url):
    """切换 origin 仓库地址；不存在 origin 时自动添加。"""
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}
    cur = _git(repo, "remote", "get-url", "origin")
    r = _git(repo, "remote", "set-url" if cur["ok"] else "add", "origin", url)
    log = _clean(["$ git remote set-url origin {}".format(url), r["out"], r["err"]])
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "切换仓库地址失败", "log": log}
    return {"ok": True, "data": {"url": url}, "log": log}


def checkout(repo, ref):
    """切换版本，并同步更新子模块。"""
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}
    r = _git(repo, "checkout", "--force", ref)
    log = _clean(["$ git checkout --force {}".format(ref), r["out"], r["err"]])
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "切换版本失败", "log": log}

    sub = _git(repo, "submodule", "update", "--init", "--recursive")
    log += _clean(["$ git submodule update --init --recursive", sub["out"], sub["err"]])
    return {"ok": True, "data": {"ref": ref}, "log": log}


def clone(url, dest, name=None):
    """克隆仓库到 dest（或 dest/name）。"""
    if not available():
        return {"ok": False, "error": "未检测到 git，无法克隆", "log": []}
    target = dest if name is None else os.path.join(dest, name)
    os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
    if os.path.exists(target):
        return {"ok": False, "error": "目标目录已存在：{}".format(target), "log": []}

    r = run(["git", "clone", "--recursive", url, target], timeout=TIMEOUT)
    log = _clean(["$ git clone --recursive {}".format(url), r["out"], r["err"]])
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "克隆失败", "log": log}
    return {"ok": True, "data": {"path": target}, "log": log}


def pull(repo):
    """更新仓库；快进失败时回退为 reset --hard + pull。"""
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}
    r = _git(repo, "pull", "--ff-only", timeout=600)
    log = _clean(["$ git pull --ff-only", r["out"], r["err"]])
    if r["ok"]:
        return {"ok": True, "data": {}, "log": log}

    rh = _git(repo, "reset", "--hard", timeout=600)
    ph = _git(repo, "pull", timeout=600)
    log += _clean(["$ git reset --hard", rh["out"], rh["err"], "$ git pull", ph["out"], ph["err"]])
    if not ph["ok"]:
        return {"ok": False, "error": ph["err"] or "更新失败", "log": log}
    return {"ok": True, "data": {}, "log": log}


def rollback(repo):
    """回退到上一个提交（会丢弃未提交的改动）。"""
    if not is_repo(repo):
        return {"ok": False, "error": "该目录不是 Git 仓库：{}".format(repo), "log": []}
    lr = _git(repo, "log", "--format=%H %s", "-2")
    commits = [c for c in (lr["out"] or "").splitlines() if c.strip()]
    if len(commits) < 2:
        return {"ok": False, "error": "只有一个提交，无法回退", "log": []}

    r = _git(repo, "reset", "--hard", "HEAD~1")
    log = _clean(["$ git reset --hard HEAD~1", "已回退到：{}".format(commits[1]), r["out"], r["err"]])
    if not r["ok"]:
        return {"ok": False, "error": r["err"] or "回退失败", "log": log}
    return {"ok": True, "data": {"to": commits[1]}, "log": log}
