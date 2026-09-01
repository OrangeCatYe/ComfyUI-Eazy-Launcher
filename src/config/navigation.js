/*
 * 导航配置 —— 侧边栏 7 项主页面
 * 图标全部取自 lucide-react（原版依赖）
 */

export const PAGES = [
  { id: 'home', label: '首页', icon: 'LayoutDashboard' },
  { id: 'kernel', label: '内核管理', icon: 'Cpu' },
  { id: 'plugins', label: '插件管理', icon: 'Blocks' },
  { id: 'deps', label: '环境依赖', icon: 'PackageSearch' },
  { id: 'tools', label: '实用工具', icon: 'Wrench' },
  { id: 'deploy', label: '初恋部署', icon: 'Rocket' },
  { id: 'settings', label: '全局设置', icon: 'Settings' },
]

/*
 * 实用工具 12 项
 * 依据：源码工具卡片注册表，已按用户要求移除「购买AI服务」「作者资源」
 */
export const TOOLS = [
  {
    id: 'models',
    label: '模型管理',
    desc: '统一管理本地模型，支持备注与 Civitai 信息匹配',
    icon: 'Boxes',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'dupdetect',
    label: '检测重复模型',
    desc: '扫描并清理重复占用的模型文件',
    icon: 'Copy',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'vision',
    label: '识图反推提示词',
    desc: '上传图片并自动生成可用提示词',
    icon: 'ScanEye',
    gradient: 'from-sky-500 to-cyan-600',
  },
  {
    id: 'workflow',
    label: '工作流管家',
    desc: '分析工作流缺失插件，一键补齐依赖',
    icon: 'Workflow',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'favorites',
    label: '提示词收藏夹',
    desc: '收藏、归纳、复用你的提示词资产，支持多级分类',
    icon: 'Bookmark',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'polish',
    label: '提示词润色',
    desc: '基于大模型优化你的提示词表达',
    icon: 'Sparkles',
    gradient: 'from-fuchsia-500 to-purple-600',
  },
  {
    id: 'media',
    label: '音视频工具',
    desc: '提取音频、消除人声、自由裁剪',
    icon: 'Film',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'shutdown',
    label: '自动关机任务',
    desc: '任务结束后自动关机，无人值守更省心',
    icon: 'Power',
    gradient: 'from-slate-500 to-slate-700',
  },
  {
    id: 'works',
    label: '我的作品',
    desc: '浏览输出目录中的生成结果',
    icon: 'Image',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'env',
    label: '环境依赖',
    desc: '检测并管理 Python 依赖与快照',
    icon: 'PackageSearch',
    gradient: 'from-lime-500 to-green-600',
  },
  {
    id: 'deployTool',
    label: '初恋部署',
    desc: '快速选择部署目录并自动补齐启动配置',
    icon: 'Rocket',
    gradient: 'from-violet-500 to-indigo-600',
  },
  {
    id: 'about',
    label: '关于作者',
    desc: '了解作者与项目信息',
    icon: 'User',
    gradient: 'from-teal-500 to-emerald-600',
  },
]

export const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.id, t]))
