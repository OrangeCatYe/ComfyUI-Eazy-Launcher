# 信息架构与路由规格

## 路由模式

内存状态路由，无 react-router。页面 ID 为字符串。

```js
page = 'home' | 'kernel' | 'plugins' | 'deps' | 'tools' | 'deploy' | 'settings'
     | 'tool:<toolId>'
```

工具页一律以 `tool:` 前缀，如 `tool:models`。
侧边栏「实用工具」在 `page.startsWith('tool:')` 时保持高亮。

配置文件：`src/config/navigation.js`

## 主页面（7 个）

| ID | 标题 | 副标题 |
|---|---|---|
| `home` | 首页 | 设备状态与快捷入口 |
| `kernel` | 内核管理 | ComfyUI 内核版本与仓库管理 |
| `plugins` | 插件管理 | 已安装插件与批量操作 |
| `deps` | 环境依赖 | Python 依赖检测与快照管理 |
| `tools` | 实用工具 | 12 个效率工具，支持长按卡片排序 |
| `deploy` | 初恋部署 | 一键部署 ComfyUI 环境 |
| `settings` | 全局设置 | 性能优化与软件设置 |

## 实用工具（12 个）

| ID | 名称 | 说明 | 图标 | 渐变 |
|---|---|---|---|---|
| `models` | 模型管理 | 统一管理本地模型，支持备注与 Civitai 信息匹配 | Boxes | indigo→violet |
| `dupdetect` | 检测重复模型 | 扫描并清理重复占用的模型文件 | Copy | amber→orange |
| `vision` | 识图反推提示词 | 上传图片并自动生成可用提示词 | ScanEye | sky→cyan |
| `workflow` | 工作流管家 | 分析工作流缺失插件，一键补齐依赖 | Workflow | emerald→teal |
| `favorites` | 提示词收藏夹 | 收藏、归纳、复用你的提示词资产，支持多级分类 | Bookmark | rose→pink |
| `polish` | 提示词润色 | 基于大模型优化你的提示词表达 | Sparkles | fuchsia→purple |
| `media` | 音视频工具 | 提取音频、消除人声、自由裁剪 | Film | blue→indigo |
| `shutdown` | 自动关机任务 | 任务结束后自动关机，无人值守更省心 | Power | slate |
| `works` | 我的作品 | 浏览输出目录中的生成结果 | Image | orange→red |
| `env` | 环境依赖 | 检测并管理 Python 依赖与快照 | PackageSearch | lime→green |
| `deployTool` | 初恋部署 | 快速选择部署目录并自动补齐启动配置 | Rocket | violet→indigo |
| `about` | 关于作者 | 了解作者与项目信息 | User | teal→emerald |

### 移除项（用户明确要求）

源码工具注册表原为 16 项，以下 2 项**已移除，不重建**：

- ~~购买AI服务~~
- ~~作者资源~~

## 顺序持久化

工具卡片支持长按拖拽排序，顺序存于 localStorage 键 `kk_tools_hub_order`（沿用原版键名）。

## 侧边栏

宽度 220px，结构自上而下：

1. **Logo 区**（px-5 py-5，底部描边）
   - 36px 渐变方块（indigo→violet）+ 「ComfyUI_KK / 专业启动器」
   - 版本徽标 `v2.0.7`
2. **导航区**（flex-1，可滚动，7 项）
   - 选中态：渐变 indigo→violet + 白色文字 + shadow
3. **底部区**：数据模式提示

## 顶栏

高度 68px，结构：

- **左**：页面标题（text-lg font-black）+ 副标题（text-[11px]）
- **右**：6 个图标按钮 + 「显示终端」按钮

右上角图标按钮顺序（P2 待校准）：刷新 / 目录 / 声音 / 主题 / 字体 / 用户

## 终端抽屉

高度 300px，位于主内容区下方。
顶部工具条：标题「终端命令行」+ 日志条数徽标 + 清空 + 收起。
日志区等宽字体，按 `terminal.md` 的前缀规范着色。
