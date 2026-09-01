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
