# 后端接口契约（Python Eel）

> 2026-09-02 新增。前端通过 `src/lib/backend.js` 的 `call()` 调用，
> 所有接口统一返回 `{ ok, data, error, log }`。

## 调用方式

前端：`call(fn, args, fallback, push)` → 成功返回 `data`，失败抛 `Error(error)`。
后端日志数组 `log` 会自动转发到终端面板，保证过程可见。

后端不可用时，`call()` 抛出 `fallback` 文案，界面提示"请通过启动器打开"。

## 接口清单（33 个）

### 通用

| 接口 | 说明 |
|---|---|
| `backend_ready()` | 探测后端是否可用，返回 Python 版本 |

### 环境与文件

| 接口 | 参数 | 说明 |
|---|---|---|
| `env_detect(comfyRoot)` | 目录 | 真实探测 Python/Pytorch/GPU/显存/Git |
| `env_validate_root(path)` | 路径 | 校验 ComfyUI 特征文件 |
| `env_list_dir(path, exts, recursive)` | 目录/后缀 | 列举文件（真实大小） |
| `env_exists(path)` | 路径 | 判断存在 |
| `dialog_pick_file(title, filetypes)` | 标题/类型 | 系统原生选择框，**返回真实绝对路径** |
| `dialog_pick_dir(title)` | 标题 | 系统原生目录选择框 |

### 内核（Git）

| 接口 | 参数 | 说明 |
|---|---|---|
| `kernel_list_versions(repo)` | 仓库 | `git fetch --tags` 后返回标签列表 |
| `kernel_current_version(repo)` | 仓库 | 当前版本与分支 |
| `kernel_set_remote(repo, url)` | 仓库/地址 | 切换或新增 origin |
| `kernel_checkout(repo, ref)` | 仓库/版本 | 切换并同步子模块 |
| `kernel_clone(url, dest, name)` | 地址/目录 | 递归克隆 |

### 插件

| 接口 | 参数 | 说明 |
|---|---|---|
| `plugins_list(comfyRoot)` | 根目录 | 列举插件及启用状态 |
| `plugin_set_enabled(root, plugin, enabled)` | 名称/布尔 | 目录重命名（可逆） |
| `plugin_uninstall(root, plugin)` | 名称 | 删除（回收站优先） |
| `plugin_update(root, plugin)` | 名称 | `git pull`，非仓库报错 |
| `plugin_rollback(root, plugin)` | 名称 | 回退到上一提交 |
| `plugin_install_deps(root, plugin, python, index)` | 名称 | 按 requirements.txt 安装 |

### pip

| 接口 | 参数 | 说明 |
|---|---|---|
| `pip_install(python, packages, index_url, upgrade)` | 包列表 | 安装 |
| `pip_uninstall(python, packages)` | 包列表 | 卸载 |
| `pip_freeze(python, out_file)` | 输出路径 | 导出依赖 |
| `pip_preview_snapshot(python, targetText)` | 快照文本 | **真实比对**差异 |
| `pip_restore_snapshot(python, added, removed, changed, index)` | 三组差异 | 真实执行恢复 |

### ffmpeg（无感自动安装）

| 接口 | 参数 | 说明 |
|---|---|---|
| `ffmpeg_probe()` | — | 返回状态：`ready`/`installing`/`failed` |
| `ffmpeg_ensure()` | — | 触发静默安装 |
| `ffmpeg_transcode(src, dst, vcodec, acodec, extra)` | 路径 | 转码 |
| `ffmpeg_extract_frames(src, out_dir, fps, pattern)` | 路径 | 抽帧 |
| `ffmpeg_compress(src, dst, crf, scale)` | 路径 | 压缩 |

### 文件系统与进程

| 接口 | 参数 | 说明 |
|---|---|---|
| `fs_delete(paths, root, use_trash)` | 路径列表 | 回收站优先，**越界拒绝** |
| `launch_start(root, python, port, extra)` | 目录/端口 | 启动 ComfyUI，返回真实 PID |
| `launch_status(task_id)` | 任务号 | 运行状态与输出 |
| `launch_stop(task_id)` | 任务号 | 终止进程 |
| `launch_open_browser(port)` | 端口 | 打开界面 |

## 安全约束

- **删除防护**：`fs_delete` 的 `root` 非空时，只删除位于其内的路径。
- **不伪造**：所有数值来自真实探测，探测不到返回空（前端显示 `—`）。
- **不假装成功**：后端失败时 `ok=false` 并给出 `error`，前端如实提示。
