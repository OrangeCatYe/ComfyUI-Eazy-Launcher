# 首页规格

> 依据「首页-已配置环境.png」「首次启动-无配置.png」
> 以及「点击累计运行卡片，播放上下翻转卡片动画后展示定时关机功能入口.png」

## 结构

1. **欢迎区**
   - 标题：欢迎使用 ComfyUI_KK 专业管理平台
   - 状态徽标：`系统就绪 环境已连接`（已配置）/ `未配置 请先设置根目录`（未配置）
   - 右侧「一键启动」按钮（`size="lg"`，`min-w-[132px]`）
2. **路径信息**：ComfyUI 根目录 / 主 Python 路径（两列，未配置显示「未配置」）
3. **当前设备信息**：6 张 `StatCard` + 1 张翻转卡
4. **快捷入口**：目录直达 / 网盘入口 / 定时关机

## 数据卡（6 项）

Python 版本、Pytorch 版本、Git 版本、GPU 型号、显存占用情况、已装插件。
无数据时显示 `—`，「已装插件」显示 `0`。

## 累计运行翻转卡（第 7 张）

点击播放上下翻转动画（`rotateX(180deg)`，`duration-500`）：

- 正面：累计运行 `0 分钟`
- 背面：定时关机入口 —— 「空闲后 30 分钟自动关机」+ 监测状态 + 开始任务

实现要点：`[perspective:1000px]` 外层 + `[transform-style:preserve-3d]` 内层，
正反两面均 `[backface-visibility:hidden]`，背面预旋转 `rotateX(180deg)`。

背面的「开始任务」按钮必须 `e.stopPropagation()`，
否则点击会冒泡到卡片导致翻转回去。点击后在
「开始任务 / 取消任务」间切换，监测状态显示「监测中 / 未开启」。

## 网盘入口弹窗

点击「网盘入口」弹出，列出 4 个网盘（数据见 `src/config/tools.js` 的 `NETDISK_LINKS`）：

夸克网盘、百度网盘、UC 网盘、迅雷网盘。
每项点击 `window.open(url, '_blank', 'noopener,noreferrer')` 打开外链。

## 配置态判定

`configured = Boolean(config?.comfyRoot)`。

**重要**：`config` 由 App 传入 `{ comfyRoot, pythonPath }`，
值来自**统一设置层** `useSettings()` 的 `comfyRoot` 与 `pythonPrimary`
（全局设置 → 软件设置 → 基础运行环境），
持久化在 `LS.SETTINGS`。设置页改动会实时反映到首页。

未配置时一键启动禁用、快捷入口显示 `EmptyState`。

## 添加本地环境（2026-09-01 新增）

**背景**：首次启动未配置根目录时，徽标显示「未配置 请先设置根目录」，
原规格只让用户自己去设置页填路径，路径长且易填错。
现规定必须在首页徽标旁提供快捷配置入口。

### 入口位置

徽标右侧常驻一个「添加本地环境」按钮（`variant="glass" size="sm"`）。
已配置但未通过校验时，该按钮文案变为「重新扫描」。

### 弹窗流程（`components/ui/AddEnvironmentModal.jsx`）

1. **选择文件夹**：`scanEnvironmentFromPicker()`
2. **真实扫描**：识别内核目录、Python 解释器、已装插件
3. **确认导入**：自动填充路径表单，可手动修正，点击「导入环境」

扫描结果全程输出到终端（`onLog`），用户可核对。

### 识别逻辑（`lib/envScan.js`）

- 按 `COMFY_MARKERS`（main.py / nodes.py / execution.py / comfy / custom_nodes）
  对各层目录打分，命中 ≥3 项判定为内核目录
- 支持向下探测 3 层，兼容整合包的嵌套结构（外层 → ComfyUI/ → 内核）
- Python 优先取 `.venv/Scripts/python.exe`，其次向上找 standalone-env
- 跳过 `node_modules`、`.git`、`__pycache__` 等大目录

### 未识别时的处理

不静默失败，展示具体原因（如「未识别到 ComfyUI 内核特征」），
并允许用户手动填写路径。此时徽标显示「已配置 未通过校验」。

### 徽标三态

| 状态 | 文案 | 条件 |
|---|---|---|
| 未配置 | 未配置 请先设置根目录 | `!configured` |
| 已校验 | 系统就绪 环境已连接 | `configured && env.verified` |
| 未校验 | 已配置 未通过校验 | `configured && !env.verified` |

## 设备信息真实性（2026-09-01 修订）

设备信息卡的数据来自**真实扫描结果** `env`，不再是硬编码。

- 已装插件：扫描得到的真实数量与名称
- Python 版本 / Pytorch 版本 / GPU 型号 / 显存：需后端探测，
  扫描阶段取不到，显示 `—`（`UNKNOWN` 常量），**不得填 0 或编造**
- 已配置但未获取详情时，卡片下方附一行说明文字

未配置时该区块显示 `EmptyState` 并带「添加本地环境」按钮。

**历史坑**：这一项曾经恒传 `null`，导致一键启动永久禁用、
快捷入口永远空状态，而页面看起来完全正常。
改这块时务必实际点一下按钮验证，别只看渲染。
