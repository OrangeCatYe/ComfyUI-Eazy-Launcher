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
│       ├── home.md
│       ├── kernel.md
│       ├── plugins.md
│       ├── deps.md
│       ├── tools.md
│       ├── deploy.md
│       ├── settings.md
│       └── tools-*.md   12 个工具页
```

## 总则

1. **源码优先**：文案、类名、交互逻辑以反混淆后的 `bundle_READY.js` 为准
2. **截图校准**：布局、间距、配色以 71 张原版截图为视觉基准
3. **空状态**：所有列表初始为空，用 `EmptyState` 占位，等待真实数据接入
4. **键名沿用**：localStorage 键名、日志格式、函数语义沿用原版
5. **P2 待校准**：图标图形、动效曲线先近似实现，标记待用户确认
