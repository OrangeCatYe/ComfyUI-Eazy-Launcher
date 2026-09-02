/*
 * 全局设置 —— 默认值与选项表
 *
 * 数据来源：bundle_READY.js 字段名实证 + 全局设置 6 张截图
 * 字段名尽量对齐源码（sharedVram / smartMemoryEnabled / hfMirror ...）
 */

export const DEFAULT_SETTINGS = {
  /* ---- 性能优化 ---- */
  computeEngine: 'auto',
  vramMode: 'auto',
  cudaMalloc: 'auto',
  attentionMode: 'auto',
  previewMethod: 'auto',
  upcastAttention: true,
  weightDtype: 'auto',
  textEncoderDtype: 'auto',
  unetDtype: 'auto',
  vaeDtype: 'auto',
  sharedVram: false,
  smartMemoryEnabled: true,
  forceCpuVae: false,

  /* ---- 基础运行环境 ---- */
  comfyRoot: '',
  pythonPrimary: '',
  pythonSecondary: '',
  port: '8188',
  sharedModelDir: '',
  extraModelPaths: '',
  sharedPluginDir: '',
  customLaunchArgs: '',

  /* ---- 远程访问 ---- */
  lanEnabled: false,

  /* ---- 网络代理 ---- */
  proxyEnabled: false,
  proxyUrl: '',

  /* ---- 大模型 API ---- */
  apiType: 'openai',
  apiBaseUrl: '',
  apiKey: '',
  apiModel: '',

  /* ---- 加速开关 ---- */
  hfMirror: true,
  pypiMirror: true,

  /* ---- 启动行为 ---- */
  autoLaunchBrowser: true,
  autoCheckPluginUpdate: true,
  autoDetectDeps: false,
  autoCleanPort: true,
  quickSwitch: false,

  /* ---- 个性设置 ---- */
  notifyOnFinish: true,
  appLock: false,
  assistantEnabled: false,
  uiScale: 'standard',

  /* ---- 关闭按钮行为 ---- */
  closeBehavior: 'ask',
}

const AUTO = { value: 'auto', label: '自动（由 ComfyUI 决定）' }

export const OPTIONS = {
  computeEngine: [
    { value: 'auto', label: '自动（由 ComfyUI 决定）' },
    { value: 'nvidia', label: 'NVIDIA GeForce RTX 4080 (16376MB)' },
    { value: 'cpu', label: 'CPU（软件渲染）' },
  ],
  vramMode: [
    AUTO,
    { value: 'highvram', label: '高显存（--highvram）' },
    { value: 'normalvram', label: '标准显存（--normalvram）' },
    { value: 'lowvram', label: '低显存（--lowvram）' },
    { value: 'novram', label: '极低显存（--novram）' },
  ],
  cudaMalloc: [
    AUTO,
    { value: 'cuda-malloc', label: '启用 --cuda-malloc' },
    { value: 'disable-cuda-malloc', label: '禁用 --disable-cuda-malloc' },
  ],
  attentionMode: [
    AUTO,
    { value: 'xformers', label: 'xformers（--use-xformers）' },
    { value: 'sdp', label: 'SDP（--use-split-cross-attention）' },
    { value: 'quad', label: 'Quad（--use-quad-cross-attention）' },
    { value: 'pytorch', label: 'PyTorch 原生（--use-pytorch-cross-attention）' },
  ],
  previewMethod: [
    AUTO,
    { value: 'latent2rgb', label: 'Latent2RGB' },
    { value: 'taesd', label: 'TAESD（更快的潜在预览）' },
    { value: 'none', label: '不生成预览图' },
  ],
  dtype: [
    { value: 'auto', label: '默认 (Auto)' },
    { value: 'fp16', label: 'FP16' },
    { value: 'bf16', label: 'BF16' },
    { value: 'fp32', label: 'FP32' },
    { value: 'fp8_e4m3fn', label: 'FP8 (e4m3fn)' },
    { value: 'fp8_e5m2', label: 'FP8 (e5m2)' },
  ],
  uiScale: [
    { value: 'standard', label: '标准' },
    { value: 'large', label: '放大' },
    { value: 'xlarge', label: '超大' },
  ],
  closeBehavior: [
    { value: 'ask', label: '每次询问' },
    { value: 'exit', label: '直接退出' },
    { value: 'tray', label: '最小化到托盘' },
  ],
  apiType: [{ value: 'openai', label: 'OpenAI兼容' }],
}

/* 常用代理端口（源码 + 截图实证） */
export const COMMON_PROXY_PORTS = ['7890', '7897', '1080', '10808', '10809']

/* 大模型 API 快捷配置（截图实证：魔搭社区/火山引擎/ChatGPT/Gemini/Agnes） */
export const API_PRESETS = [
  { label: '魔搭社区', url: 'https://api-inference.modelscope.cn/v1' },
  { label: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { label: 'ChatGPT', url: 'https://api.openai.com/v1' },
  { label: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'Agnes', url: '' },
]
