/*
 * 实用工具 —— 静态数据集
 *
 * 数据来源：补充截图（模型管理/检测重复模型/识图反推/工作流管家/
 *   提示词收藏夹/提示词润色/音视频工具/自动关机/我的作品/关于作者）
 *
 * 数据策略：空状态优先，所有列表默认为空（等待后端接入）
 */

import { Cloud, Blocks, HardDrive, Cpu } from 'lucide-react'

/* 模型管理 —— 目录与快捷筛选 */
export const MODEL_DIRS = ['checkpoints', 'diffusion_models', 'loras', '其它目录']

export const MODEL_QUICK_FILTERS = [
  '全部模型',
  '有备注模型',
  '常用模型',
  '按工作流',
  '已匹配C站',
  '检测重复模型',
  '匹配Lora信息',
  '有图片备注',
]

export const MODEL_SORTS = ['体积从大到小', '体积从小到大', '名称 A-Z', '最近添加']

/* 检测重复模型 —— 文件格式过滤 */
export const DUP_MODEL_EXTS = ['.safetensors', '.ckpt', '.bin', '.pt', '.gguf']

/* 提示词润色 —— 目标模型（截图实证，含描述） */
export const POLISH_MODELS = [
  { id: 'wan', name: '阿里Wan系列（文/图生视频）', desc: '强调运动幅度、运镜方式与光影质感' },
  { id: 'ltx2', name: 'LTX2系列（文/图生视频）', desc: '注重物理规律、连贯性与电影感' },
  { id: 'qwen-edit-2511', name: 'Qwen-edit-2511（图像编辑）', desc: '精确描述原图、遮罩区域与修改指令' },
  { id: 'qwen-image-2512', name: 'Qwen-image-2512（文生图）', desc: '通用性强，支持中文语境转译' },
  { id: 'z-image-turbo', name: 'Z-image-turbo（文生图）', desc: '极速生成，适合短语与标签组合' },
  { id: 'z-image', name: 'Z-image（文生图）', desc: '高细节描述，适合艺术创作' },
  { id: 'flux2-klein', name: 'FLUX.2-klein（文生图/编辑）', desc: '偏好自然语言描述，细节丰富' },
  { id: 'nanobanana2', name: '谷歌nanobanana2（文生图）', desc: 'Gemini驱动，极强的语义理解能力' },
  { id: 'sora2', name: 'Sora 2（文/图生视频）', desc: '世界模拟器，需描述物理交互细节' },
  { id: 'custom', name: '自定义提示词模板', desc: '使用你在自定义规则中输入的模板' },
]

/* 关于作者 —— 推荐插件（截图实证，含真实仓库地址） */
export const AUTHOR_PLUGINS = [
  {
    name: 'ComfyUI-Manager',
    label: 'ComfyUI管理器',
    url: 'https://github.com/Comfy-Org/ComfyUI-Manager.git',
  },
  {
    name: 'ComfyUI-Crystools',
    label: '资源监控插件',
    url: 'https://github.com/crystian/ComfyUI-Crystools.git',
  },
  {
    name: 'ComfyUI-DD-Translation',
    label: '中文汉化插件',
    url: 'https://github.com/Dondrink/ComfyUI-DD-Translation.git',
  },
  {
    name: 'ComfyUI-Prompt-Assistant',
    label: '提示词小助手',
    url: 'https://github.com/yawiii/ComfyUI-Prompt-Assistant.git',
  },
  {
    name: 'ComfyUI-KJNodes',
    label: 'KJ节点',
    url: 'https://github.com/kijai/ComfyUI-KJNodes.git',
  },
]

export const AUTHOR_TABS = ['推荐插件', '推荐工具', '资源网站', '软件声明', '作者信息']

/*
 * 首页快捷入口（环境已配置时展示）。
 *
 * 历史缺陷：HomePage 一直在渲染 QUICK_LINKS.map(...)，但该常量从未定义。
 * 它藏在 configured 三元分支里，环境未配置时永不执行，
 * 直到首次成功导入环境才触发 ReferenceError——被 ErrorBoundary 捕获。
 * id 与 HomePage.handleQuickLink 的分支对齐（netdisk 打开网盘弹窗）。
 */
export const QUICK_LINKS = [
  { id: 'netdisk', label: '网盘资料入口', desc: '夸克/百度/UC/迅雷网盘', icon: Cloud },
  { id: 'plugins', label: '插件管理', desc: '已装插件开关与批量操作', icon: Blocks },
  { id: 'tool:MODEL_MANAGER', label: '模型管理', desc: '扫描模型目录真实体积', icon: HardDrive },
  { id: 'tools', label: '实用工具', desc: '识图反推、音视频处理等', icon: Cpu },
]

/* 首页快捷入口 —— 网盘资料入口（截图实证，含真实链接） */
export const NETDISK_LINKS = [
  { name: '夸克网盘', url: 'https://pan.quark.cn/s/1f226f92b30f' },
  { name: '百度网盘', url: 'https://pan.baidu.com/s/1kzPHTSzY9JA9FChtQccuHg?pwd=dxy7' },
  { name: 'UC网盘', url: 'https://drive.uc.cn/s/d1b1aee1c46f4' },
  { name: '迅雷网盘', url: 'https://pan.xunlei.com/s/VOgMf5tQp1hksFs2wFTgyuLA1?pwd=cdun' },
]

/* 音视频工具 —— 三个子功能 Tab */
export const MEDIA_TABS = [
  { id: 'extract', label: '提取音频' },
  { id: 'mute', label: '消除原声' },
  { id: 'trim', label: '裁剪音频' },
]

export const MEDIA_USAGE = [
  '视频支持常见本地格式，提取后统一输出为「MP3」。',
  '静音导出会保留原视频容器格式，方便直接替换或二次剪辑。',
  '音频裁剪按原格式输出，更适合快速截取片头、片尾或中间片段。',
]

/* 我的作品 —— 筛选与排序 */
export const WORKS_TYPE_FILTERS = ['全部类型', '图片', '视频']
export const WORKS_SORT = ['最新生成', '最早生成', '体积从大到小']

/* 提示词收藏夹 —— 默认分类（截图实证） */
export const PROMPT_CATEGORIES = [
  { id: 'capsule', name: '闪念胶囊', desc: '把临时想到的提示词、参数、灵感或图片备注放在这里，稍后可以在提示词收藏夹继续整理。' },
  { id: 'create', name: '创作提示词', desc: '创作类提示词资产，按风格与题材归纳。' },
  { id: 'character', name: '人物设定模板', desc: '人物设定与角色描述模板。' },
]
