# 页面规格索引

> 本目录补齐 `README.md` 声明但此前缺失的页面规格。
> 主页面 7 个 + 工具页 10 个（另 2 个为 action，无页面）。

| 文件 | 页面 |
|---|---|
| [home.md](./home.md) | 首页 |
| [kernel.md](./kernel.md) | 内核管理 |
| [plugins.md](./plugins.md) | 插件管理 |
| [deps.md](./deps.md) | 环境依赖 |
| [deploy.md](./deploy.md) | 初恋部署 |
| [settings.md](./settings.md) | 全局设置 |
| [tools.md](./tools.md) | 实用工具（10 个工具页汇总） |

## 通用约束

- 页面根容器：`p-6 space-y-5`
- 区块：`SectionCard`，间距 `space-y-5`
- 列表空态：`EmptyState`
- 输出一律走终端，遵循 `../terminal.md`

## 工具页与 action 的区分

`TOOLS` 共 12 项，其中 `kind: 'page'` 的 10 项有独立页面，
`kind: 'action'` 的 2 项（官方模型下载、免费云端算力）**不进页面**，
点击直接打开外链，仅输出一行终端日志。

## 交互完备性要求（重要）

**禁止出现未接线的按钮。** 所有 `<Button>` 必须有 `onClick`，
哪怕只是弹出提示或写入一条日志。理由：
复刻项目的价值在于交互可信度，一个点了没反应的按钮
比缺这个功能更破坏还原度。

按钮的行为分三类，按功能性质选择：

1. **需要留痕的** → 走终端日志（`onAction` → App 的 handler）
   适用于：插件/内核/环境依赖等会产生命令输出的操作
2. **只需反馈的** → 走 Toast（`showToast(type, title, message)`）
   适用于：本页内的工具操作、复制、刷新等
3. **危险的** → 先 `ConfirmModal` 二次确认，再执行
   适用于：卸载、删除、重置等不可撤销操作

**空列表也要可用**：即使数据为空，按钮仍要响应，
校验前置条件并给出提示（例如「请先勾选要删除的文件」），
而不是静默无反应。

## 通用文件选择

浏览器环境无原生目录对话框，统一用 `src/lib/picker.js`：
`pickDirectory()` / `pickFile(accept)`。
接入 Electron / Eel 后改为原生对话框，签名不变。
