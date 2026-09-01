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
