/*
 * 导航配置
 *
 * 数据来源：反混淆后的原版前端 bundle_READY.js 工具卡片注册表
 * 已按用户要求移除 2 项：buy-ai-service（购买AI服务）、author-resources（作者资源）
 * 图标取自 lucide-react（原版依赖）
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
 * 实用工具 14 项（源码注册表 16 项 - 用户指定移除 2 项）
 *
 * kind 说明（源码实证）：
 *   page   —— 点击进入独立工具页
 *   action —— 不进页面，直接执行动作（打开外链/弹窗）
 *
 * 排序依据：源码注册表原始顺序 + 截图「实用工具.png」实证
 */
export const TOOLS = [
  {
    id: 'MODEL_MANAGER',
    label: '模型管理',
    desc: '统一管理本地模型，支持模型备注、清理与 Civitai 信息匹配。',
    icon: 'Boxes',
    gradient: 'from-indigo-500 to-violet-600',
    kind: 'page',
  },
  {
    id: 'DUP_MODEL',
    label: '检测重复模型',
    desc: '按文件名和哈希值扫描 models 目录，支持批量清理。',
    icon: 'Copy',
    gradient: 'from-amber-500 to-orange-600',
    kind: 'page',
  },
  {
    id: 'IMAGE_PROMPT_REV',
    label: '识图反推提示词',
    desc: '上传或拖入图片，调用已配置大模型自动反向解析生成提示词。',
    icon: 'ScanEye',
    gradient: 'from-sky-500 to-cyan-600',
    kind: 'page',
  },
  {
    id: 'WORKFLOW_HUB',
    label: '工作流管家',
    desc: '读取 workflows 列表，按所选工作流仅加载必需插件并快速启动。',
    icon: 'Workflow',
    gradient: 'from-emerald-500 to-teal-600',
    kind: 'page',
  },
  {
    id: 'PROMPT_FAVORITES',
    label: '提示词收藏夹',
    desc: '本地保管常用提示词资产，支持与闪念胶囊数据互通。',
    icon: 'Bookmark',
    gradient: 'from-rose-500 to-pink-600',
    kind: 'page',
  },
  {
    id: 'POLISH',
    label: '提示词润色',
    desc: '集成阿里 Wan、LTX、Flux 等热门模型模板，AI 自动润色。',
    icon: 'Sparkles',
    gradient: 'from-fuchsia-500 to-purple-600',
    kind: 'page',
  },
  {
    id: 'MEDIA_TOOLS',
    label: '音视频工具',
    desc: '提取视频音频为 MP3、消除视频原声、自由裁剪音频片段并保存到本地。',
    icon: 'Film',
    gradient: 'from-blue-500 to-indigo-600',
    kind: 'page',
  },
  {
    id: 'AUTO_SHUTDOWN',
    label: '自动关机任务',
    desc: '定时或空闲时自动关机，统一管理倒计时提醒。',
    icon: 'Power',
    gradient: 'from-slate-500 to-slate-700',
    kind: 'page',
  },
  {
    id: 'MY_WORKS',
    label: '我的作品',
    desc: '浏览生成的图片和视频，查看详细的生成参数。',
    icon: 'Image',
    gradient: 'from-orange-500 to-red-600',
    kind: 'page',
  },
  {
    id: 'ABOUT_AUTHOR',
    label: '关于作者',
    desc: '收录实用插件、工具与资源站，一键访问便捷安装。',
    icon: 'User',
    gradient: 'from-teal-500 to-emerald-600',
    kind: 'page',
  },
  {
    id: 'comfy-model-release',
    label: '官方模型下载',
    desc: '打开 Comfy-Org 在魔搭社区的模型发布页面，快速查看与获取官方模型资源。',
    icon: 'Download',
    gradient: 'from-cyan-500 to-blue-600',
    kind: 'action',
    url: 'https://www.modelscope.cn/organization/Comfy-Org',
  },
  {
    id: 'free-cloud-compute',
    label: '免费云端算力',
    desc: '新用户注册领 1000 RH 币，每日登录再领 100 币。',
    icon: 'Cloud',
    gradient: 'from-violet-500 to-purple-600',
    kind: 'action',
    url: 'https://www.runninghub.cn/?invitationCode=rh-v1942b78',
  },
]

export const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.id, t]))

/* 仅可进入页面的工具，用于路由匹配 */
export const TOOL_PAGES = TOOLS.filter((t) => t.kind === 'page').map((t) => t.id)
