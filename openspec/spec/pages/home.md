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

**历史坑**：这一项曾经恒传 `null`，导致一键启动永久禁用、
快捷入口永远空状态，而页面看起来完全正常。
改这块时务必实际点一下按钮验证，别只看渲染。
