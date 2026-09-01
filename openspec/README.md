# OpenSpec — ComfyUI_KK 启动器前端复刻规格基准

> 本目录是项目的**唯一规格基准**。任何界面重建、组件改动都以此为准。
> 设计背景与源码分析见 `../docs/DESIGN.md`。

## 目录结构

```
openspec/
├── README.md            本文件 —— 规格索引与总则
├── spec/
│   ├── theme.md         主题 Token 与视觉基线
│   ├── components.md    通用组件规格
│   ├── navigation.md    信息架构与路由
│   ├── terminal.md      终端输出协议（三个非弹窗功能的契约）
│   ├── backend.md       Python Eel 后端接口契约（2026-09-02 新增）
│   └── pages/
│       ├── README.md    页面索引 + 交互完备性要求
│       ├── home.md
│       ├── kernel.md
│       ├── plugins.md
│       ├── deps.md
│       ├── deploy.md
│       ├── settings.md
│       └── tools.md     10 个工具页汇总
```

## 运行形态（2026-09-02 更新）

项目已接入 **Python Eel 后端**，不再是纯前端预览：

```
backend/
├── main.py              入口：依赖自愈 + 托管 dist + 暴露 33 个接口
├── requirements.txt     eel / imageio-ffmpeg
├── 启动脚本             根目录「启动 ComfyUI_KK.bat」
└── services/
    ├── runner.py        统一子进程执行（超时/编码/隐藏控制台）
    ├── git_ops.py       内核版本与插件的 git 操作
    ├── pip_ops.py       pip 安装/卸载/导出/快照恢复
    ├── ffmpeg_ops.py    ffmpeg 无感自动安装 + 转码/抽帧/压缩
    ├── fs_ops.py        文件删除（回收站优先）与目录列举
    ├── env_ops.py       Python/Pytorch/GPU/显存/Git 真实探测
    ├── plugin_ops.py    插件启用/停用/卸载/更新/回滚
    └── launch_ops.py    ComfyUI 进程启动与管理（真实 PID）
```

前端通过 `src/lib/backend.js` 桥接层调用，统一返回 `{ ok, data, error, log }`。

## 总则

1. **源码优先**：文案、类名、交互逻辑以反混淆后的 `bundle_READY.js` 为准
2. **截图校准**：布局、间距、配色以 71 张原版截图为视觉基准
3. **空状态**：所有列表初始为空，用 `EmptyState` 占位，等待真实数据接入
4. **键名沿用**：localStorage 键名、日志格式、函数语义沿用原版
5. **P2 待校准**：图标图形、动效曲线先近似实现，标记待用户确认
6. **交互完备**：禁止未接线的按钮，详见 `spec/pages/README.md`
7. **数据真实**（2026-09-01 新增，最高优先级）：禁止任何模拟数据，详见下方专节

## 公共约定

### 文件/目录选择

统一用 `src/lib/picker.js` 的 `pickDirectory()` / `pickFile(accept)`。
浏览器环境无原生目录对话框，内部用 `<input type="file">` 近似。
接入 Electron / Eel 后只改这个文件，调用方不动。

### 反馈方式的选择

| 场景 | 方式 |
|---|---|
| 会产生命令输出的操作（插件/内核/环境依赖） | 终端日志 |
| 页内工具操作、复制、刷新 | Toast |
| 不可撤销操作（删除/卸载/重置） | ConfirmModal + 上述之一 |

### 环境路径

只有 `SettingsProvider` 一处来源，页面用 `useSettings()` 读取。
不要另建 localStorage 键，否则设置页与首页数据会不一致。

## 数据真实性约定（2026-09-01）

用户明确要求：**去掉所有的模拟数据，完善所有真实逻辑**。
以下为强制执行的分级规则，新增代码一律遵守。

### 三条铁律

1. 禁止 `Math.random()` 生成任何展示数据（耗时、版本号、进度、PID 等）
2. 禁止硬编码假路径、假版本号、假硬件型号（如写死 `C:\ComfyUI\...`、RTX 4080）
3. 禁止假装成功：操作未真实执行时，不得弹出「操作成功」，须说明原因

### 分级处理

| 能力 | 做法 | 示例 |
|---|---|---|
| 前端可真实完成 | 实现真实逻辑，产出真实文件/结果 | 目录扫描、依赖文本比对、文件哈希、测速、导出配置 |
| 前端无法完成 | 明确提示「需要后端」，不伪造结果 | git 操作、pip 安装、ffmpeg 转码、文件删除 |
| 暂时取不到 | 显示 `—` 或「未获取」，留空 | Pytorch 版本、GPU 型号、显存占用 |

**判定标准**：凡是「结果会写入用户磁盘、或依赖用户真实环境」的，必须真实；
凡是「需要调 git / pip / ffmpeg / 系统 API」的，标注需要后端，不得模拟。

### 已落地的真实功能

| 功能 | 真实来源 | 实现 |
|---|---|---|
| 添加本地环境 | File System Access API 遍历真实目录 | `lib/envScan.js` |
| 环境识别 | 按 `main.py`/`nodes.py`/`custom_nodes` 打分，自动下钻嵌套 | `scanEnvironmentFromPicker()` |
| 模型列表 | 真实读取文件名与字节大小 | `scanModelDirectory()` |
| 重复模型检测 | Web Crypto 采样哈希（头尾各 1MB + size） | `lib/dupScan.js` |
| 环境依赖比较 | 真实解析两份 requirements.txt 并 diff | `lib/api.js` |
| 查询引用插件 | 真实读取各插件 requirements.txt | `findLibInPlugins()` |
| 镜像源测速 | 真实 HTTP 请求测往返耗时 | `DepsPage.measureMirror()` |
| 网络连通测试 | 真实 fetch 探测 | `SettingsPage` |
| 本机局域网 IP | WebRTC ICE candidate 真实探测 | `SettingsPage.refreshLanIp()` |
| 配置导出/导入 | 真实读写 JSON 文件 | `SaveBar` |
| 我的作品 / 工作流 | 真实遍历目录列文件 | `scanFilesDirectory()` |

### 标注为「需要后端」的功能（2026-09-02 进度更新）

**已接入真实后端（不再提示"需要后端"）**：

| 功能 | 后端实现 | 接口 |
|---|---|---|
| 内核版本列表拉取 | `git fetch --tags` + `tag --sort` | `kernel_list_versions` |
| 切换远程仓库 | `git remote set-url/add` | `kernel_set_remote` |
| 切换内核版本 | `git checkout --force` + 子模块更新 | `kernel_checkout` |
| 插件列表 | 真实读取 `custom_nodes` | `plugins_list` |
| 插件启用/停用 | 目录重命名（可逆） | `plugin_set_enabled` |
| 插件卸载 | 删除目录（回收站优先） | `plugin_uninstall` |
| 插件更新/回滚 | `git pull` / `git reset --hard HEAD~1` | `plugin_update` / `plugin_rollback` |
| 快照依赖比对 | `pip freeze` 后与快照 diff | `pip_preview_snapshot` |
| 快照依赖恢复 | `pip uninstall` + `pip install` | `pip_restore_snapshot` |
| 媒体转码/抽帧/压缩 | ffmpeg（无感自动安装） | `ffmpeg_*` |
| 文件删除 | 回收站优先，越界拒绝 | `fs_delete` |
| 启动 ComfyUI | 真实子进程 + 真实 PID | `launch_start` |
| 环境探测 | Python/Pytorch/GPU/显存/Git | `env_detect` |
| 文件/目录选择 | 系统原生对话框（真实绝对路径） | `dialog_pick_*` |

**仍为前端占位**（后端已备接口，UI 待接入）：初恋部署的一键流程。

### 浏览器限制（重要）

`showDirectoryPicker` 在 `file://` 协议下的支持因浏览器而异。
`envScan.js` 已实现降级：首选 API，失败则回退 `<input webkitdirectory>`。
**推荐用 Chrome / Edge 打开，并在功能异常时提示用户检查浏览器。**

## 已完成的功能边界

- 7 个主页面 + 10 个工具页，全部渲染完整
- 三个终端协议功能（`spec/terminal.md`）
- 深色主题完整两套 token
- 实用工具长按拖拽排序并持久化
- 所有按钮均已接线（无死按钮）

## 尚未接入的部分

- **数据**：列表在环境路径配置后由后端自动填充，UI 层无需改动
- **后端**：`src/lib/api.js` 已接入 Eel 真实实现，
  仅保留前端可真实完成的逻辑（requirements 解析与比对）
- **部署**：初恋部署的一键流程仍为前端占位，后端接口已备
- **P2 待校准**：见 `../docs/DESIGN.md` 第 9 节

## ffmpeg 自动安装策略（用户无感）

优先级依次降级，**全程无需用户干预**：

1. ComfyUI 整合包内置 / `imageio-ffmpeg`
2. 系统 PATH 中的 `ffmpeg`
3. 常见安装位置扫描（Windows 各盘符、`LOCALAPPDATA`）
4. 后台静默 `pip install imageio-ffmpeg`

启动时后台预热；若调用时尚未就绪，前端轮询等待（最长 4 分钟），
用户侧只看到"处理中"，不会弹出任何安装提示或报错。
