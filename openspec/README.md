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

### 标注为「需要后端」的功能

内核版本拉取与切换、插件安装/启停/卸载/批量操作、快照恢复执行、
媒体转码、文件删除、部署流程。**这些在 UI 上均明确提示，不产生假结果。**

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

- **数据**：所有列表为空，等真实数据接入后 UI 层无需改动
- **后端**：`src/lib/api.js` 全部为模拟实现，
  函数签名与参数顺序已按 terminal.md 对齐，接入时只替换函数体
- **P2 待校准**：见 `../docs/DESIGN.md` 第 9 节
