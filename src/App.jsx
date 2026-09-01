import { useCallback, useMemo, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { TerminalDrawer } from './components/layout/TerminalDrawer'
import { TOOLS, TOOL_MAP, TOOL_PAGES } from './config/navigation'
import * as ICONS from './lib/icons'
import { UIProvider } from './store/uiStore'
import { SettingsProvider } from './store/settingsStore'
import { ToastProvider } from './components/ui/Toast'
import { createLogger } from './lib/logger'
import HomePage from './pages/HomePage'
import KernelPage from './pages/KernelPage'
import PluginsPage from './pages/PluginsPage'
import DepsPage from './pages/DepsPage'
import ToolsPage from './pages/ToolsPage'
import DeployPage from './pages/DeployPage'
import SettingsPage from './pages/SettingsPage'
import ModelManagerPage from './pages/tools/ModelManager'
import DupModelPage from './pages/tools/DupModel'
import ImagePromptRevPage from './pages/tools/ImagePromptRev'
import WorkflowHubPage from './pages/tools/WorkflowHub'
import PromptFavoritesPage from './pages/tools/PromptFavorites'
import PolishPage from './pages/tools/Polish'
import MediaToolsPage from './pages/tools/MediaTools'
import AutoShutdownPage from './pages/tools/AutoShutdown'
import MyWorksPage from './pages/tools/MyWorks'
import AboutAuthorPage from './pages/tools/AboutAuthor'

/* 工具页路由表：id → 组件 */
const TOOL_ROUTES = {
  MODEL_MANAGER: ModelManagerPage,
  DUP_MODEL: DupModelPage,
  IMAGE_PROMPT_REV: ImagePromptRevPage,
  WORKFLOW_HUB: WorkflowHubPage,
  PROMPT_FAVORITES: PromptFavoritesPage,
  POLISH: PolishPage,
  MEDIA_TOOLS: MediaToolsPage,
  AUTO_SHUTDOWN: AutoShutdownPage,
  MY_WORKS: MyWorksPage,
  ABOUT_AUTHOR: AboutAuthorPage,
}

/* 初恋部署静态数据（截图实证：驱动 591.44 / RTX 4080 / Python 3.12 / Torch 2.10.0+cu128） */
const DEPLOY_DRIVER = {
  version: '591.44',
  gpu: 'NVIDIA GeForce RTX 4080',
  arch: 'ada',
}

const DEPLOY_VERSIONS = {
  python: '3.12',
  torch: '2.10.0+cu128',
}

const PAGE_META = {
  home: { title: '首页', subtitle: '设备状态与快捷入口' },
  home: { title: '首页', subtitle: '设备状态与快捷入口' },
  kernel: { title: '内核管理', subtitle: 'ComfyUI 内核版本与仓库管理' },
  plugins: { title: '插件管理', subtitle: '已安装插件与批量操作' },
  deps: { title: '环境依赖', subtitle: 'Python 依赖检测与快照管理' },
  tools: { title: '实用工具', subtitle: `${TOOLS.length} 个效率工具` },
  deploy: { title: '初恋部署', subtitle: '一键部署 ComfyUI 环境' },
  settings: { title: '全局设置', subtitle: '性能优化与软件设置' },
}

/* 工具卡图标解析：把配置里的图标名映射为 lucide 组件 */
const TOOLS_WITH_ICONS = TOOLS.map((t) => ({ ...t, icon: ICONS[t.icon] || ICONS.Boxes }))

export default function App() {
  const [page, setPage] = useState('home')
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [logs, setLogs] = useState([])
  /* 内核运行态：running 为真时终端显示「停止运行」与 PID */
  const [running, setRunning] = useState(false)
  const [pid, setPid] = useState(null)
  /* 初恋部署：进度与阶段状态 */
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployStatus, setDeployStatus] = useState('待命')
  const [deployDir, setDeployDir] = useState('')

  /* 全局开关状态（空数据阶段先本地托管） */
  const [autoInstall, setAutoInstall] = useState(true)
  const [safeMode, setSafeMode] = useState(false)

  const { push, clear } = useMemo(() => createLogger(setLogs), [])

  const navigate = useCallback((id) => setPage(id), [])

  const openTool = useCallback((tool) => {
    if (tool.kind === 'action') {
      push({ level: 'info', text: `[ACTION] 触发动作：${tool.label}（外链/弹窗，S3 阶段实现）` })
      return
    }
    setPage(`tool:${tool.id}`)
  }, [push])

  const meta = useMemo(() => {
    if (page.startsWith('tool:')) {
      const tool = TOOL_MAP[page.slice(5)]
      return { title: tool?.label || '工具', subtitle: tool?.desc || '' }
    }
    return PAGE_META[page] || { title: '', subtitle: '' }
  }, [page])

  const renderPage = () => {
    if (page.startsWith('tool:')) {
      const id = page.slice(5)
      const ToolComponent = TOOL_ROUTES[id]
      return ToolComponent ? <ToolComponent /> : <ToolPlaceholder id={id} />
    }
    switch (page) {
      case 'home':
        return (
          <HomePage
            config={null}
            running={running}
            onLaunch={handleLaunch}
          />
        )
      case 'kernel':
        return (
          <KernelPage
            versions={[]}
            currentVersion="v0.33.1"
            repoUrl="https://github.com/Comfy-Org/ComfyUI.git"
            autoInstall={autoInstall}
            onToggleAutoInstall={setAutoInstall}
          />
        )
      case 'plugins':
        return (
          <PluginsPage
            plugins={[]}
            autoInstall={autoInstall}
            onToggleAutoInstall={setAutoInstall}
            safeMode={safeMode}
            onToggleSafeMode={setSafeMode}
          />
        )
      case 'deps':
        return <DepsPage onAction={handleDepsAction} logs={logs} onClearLogs={clear} />
      case 'tools':
        return <ToolsPage tools={TOOLS_WITH_ICONS} onOpen={openTool} />
      case 'deploy':
        return (
          <DeployPage
            driver={DEPLOY_DRIVER}
            versions={DEPLOY_VERSIONS}
            dir={deployDir}
            progress={deployProgress}
            status={deployStatus}
            onPickDir={handlePickDeployDir}
            onDeploy={handleDeploy}
          />
        )
      case 'settings':
        return <SettingsPage />
      default:
        return null
    }
  }

  /* 环境依赖页动作 → 终端输出（S4 补全真实逻辑） */
  function handleDepsAction(name, payload) {
    const map = {
      speedTest: '>>> 正在启动镜像源测速...',
      analyzeReq: '>>> 正在分析依赖文件...',
      checkConflict: '>>> 正在检测冲突与缺失...',
      installDeps: '>>> 正在安装依赖...',
      viewEnv: '>>> 查看当前环境...',
      findConflict: '>>> 正在查找环境冲突...',
      compareEnv: '>>> 启动环境比较工具...',
      findRefs: `>>> 正在扫描引用了 [${payload || ''}] 的插件...`,
      startTerminal: '>>> 启动终端...',
      backupEnv: '>>> 正在备份当前环境...',
      restoreSnapshot: '>>> 请选择要恢复的快照文件...',
      applyMirror: `>>> 已应用镜像源：${payload ?? ''}`,
      speedTestOne: ` - ${payload?.mirror ?? ''} (${payload?.secs ?? ''}秒)`,
      speedTestDone: `>>> 测速完成!检测到最快源为:${payload?.mirror ?? ''}(${payload?.secs ?? ''}秒)\n已自动切换。`,
      copyLog: '>>> 日志信息已复制到剪贴板',
      copyLogFail: '>>> 复制失败，请手动选择日志文本复制',
    }
    /* 清空日志为独立回调，不产生新日志 */
    if (name === 'clearLog') {
      clear()
      return
    }
    push({ level: name === 'speedTestDone' ? 'success' : 'info', text: map[name] || `>>> ${name}` })
    setTerminalOpen(true)
  }

  /* 启动 / 停止内核（无后端阶段：本地模拟运行态与 PID） */
  function handleLaunch() {
    if (running) {
      setRunning(false)
      setPid(null)
      push({ level: 'warning', text: '>>> 内核已停止运行' })
      return
    }
    const fakePid = 1000 + Math.floor(Math.random() * 9000)
    setRunning(true)
    setPid(fakePid)
    setTerminalOpen(true)
    push({ level: 'cmd', text: '>>> 正在启动 ComfyUI 内核...' })
    push({ level: 'info', text: `[INFO] 进程已创建，PID: ${fakePid}` })
    setTimeout(() => {
      push({ level: 'info', text: '[INFO] Checkpoint files will always be loaded safely.' })
      push({ level: 'info', text: '[INFO] Total VRAM 16376 MB, total RAM 130701 MB' })
    }, 400)
    setTimeout(() => {
      push({ level: 'info', text: '[INFO] Device: cuda:0 NVIDIA GeForce RTX 4080 : cudaMallocAsync' })
      push({ level: 'success', text: '[INFO] ComfyUI 启动完成，可点击「打开浏览器」访问' })
    }, 900)
  }

  /* 选择部署目录（浏览器环境下无本地文件对话框，改用输入提示） */
  function handlePickDeployDir() {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.directory = true
    input.multiple = false
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      const path = f.webkitRelativePath.split('/')[0] || f.name
      setDeployDir(path)
      push({ level: 'info', text: `>>> 已选择部署目录：${path}` })
    }
    input.click()
  }

  /* 初恋部署：按阶段推进进度（无后端阶段本地模拟） */
  function handleDeploy() {
    if (deployProgress > 0 && deployProgress < 100) return

    const steps = [
      { at: 10, status: '创建部署目录', text: '>>> 正在创建部署目录...' },
      { at: 35, status: '下载 Python', text: '>>> 正在下载并解压 Python 运行环境...' },
      { at: 50, status: '创建虚拟环境', text: '>>> 正在创建虚拟环境...' },
      { at: 75, status: '安装 Pytorch', text: '>>> 正在安装 Pytorch+Cuda 套件（耗时较长）...' },
      { at: 90, status: '拉取仓库', text: '>>> 正在拉取 ComfyUI 仓库...' },
      { at: 100, status: '完成', text: '>>> 正在安装依赖并收尾...' },
    ]

    setDeployProgress(0)
    setDeployStatus(steps[0].status)
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 开始部署 ComfyUI 整合包...' })

    steps.forEach((s, i) => {
      setTimeout(() => {
        setDeployProgress(s.at)
        setDeployStatus(s.status)
        push({ level: 'info', text: s.text })
        if (i === steps.length - 1) {
          push({ level: 'success', text: '>>> 部署完成！可以启动内核了。' })
        }
      }, (i + 1) * 700)
    })
  }

  /* 生成日志：把当前日志导出为 .log 文件 */
  function handleAiAnalyze() {
    if (logs.length === 0) {
      push({ level: 'warning', text: '>>> 暂无日志可分析' })
      return
    }
    const total = logs.length
    const errs = logs.filter(
      (l) => (typeof l === 'string' ? l : l.text).includes('失败') ||
        (typeof l === 'string' ? l : l.text).includes('错误')
    ).length
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> AI 日志分析开始...' })
    push({ level: 'info', text: ` - 日志总行数：${total}` })
    push({ level: 'info', text: ` - 错误/失败条目：${errs}` })
    push({
      level: errs > 0 ? 'warning' : 'success',
      text: errs > 0 ? 'AI 建议：存在错误条目，建议优先排查上述报错。' : 'AI 建议：未发现明显异常。',
    })
  }

  /* 选择部署目录（浏览器环境下无本地文件对话框，改用输入提示） */
  function handlePickDeployDir() {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.directory = true
    input.multiple = false
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      const path = f.webkitRelativePath.split('/')[0] || f.name
      setDeployDir(path)
      push({ level: 'info', text: `>>> 已选择部署目录：${path}` })
    }
    input.click()
  }

  /* 初恋部署：按阶段推进进度（无后端阶段本地模拟） */
  function handleDeploy() {
    if (deployProgress > 0 && deployProgress < 100) return

    const steps = [
      { at: 10, status: '创建部署目录', text: '>>> 正在创建部署目录...' },
      { at: 35, status: '下载 Python', text: '>>> 正在下载并解压 Python 运行环境...' },
      { at: 50, status: '创建虚拟环境', text: '>>> 正在创建虚拟环境...' },
      { at: 75, status: '安装 Pytorch', text: '>>> 正在安装 Pytorch+Cuda 套件（耗时较长）...' },
      { at: 90, status: '拉取仓库', text: '>>> 正在拉取 ComfyUI 仓库...' },
      { at: 100, status: '完成', text: '>>> 正在安装依赖并收尾...' },
    ]

    setDeployProgress(0)
    setDeployStatus(steps[0].status)
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 开始部署 ComfyUI 整合包...' })

    steps.forEach((s, i) => {
      setTimeout(() => {
        setDeployProgress(s.at)
        setDeployStatus(s.status)
        push({ level: 'info', text: s.text })
        if (i === steps.length - 1) {
          push({ level: 'success', text: '>>> 部署完成！可以启动内核了。' })
        }
      }, (i + 1) * 700)
    })
  }

  /* 生成日志：把当前日志导出为 .log 文件 */
  function handleExportLog() {
    if (logs.length === 0) {
      push({ level: 'warning', text: '>>> 暂无日志可导出' })
      return
    }
    const text = logs.map((l) => (typeof l === 'string' ? l : l.text)).join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    a.href = url
    a.download = `kk-launcher-${ts}.log`
    a.click()
    URL.revokeObjectURL(url)
    push({ level: 'success', text: `>>> 日志已导出（${logs.length} 行）` })
  }

  return (
    <SettingsProvider>
      <UIProvider>
        <ToastProvider>
          <div className="h-full flex overflow-hidden bg-[var(--bg-main)]">
          <Sidebar current={page} onNavigate={navigate} />

          <div className="flex-1 flex flex-col min-w-0">
            <TopBar
              title={meta.title}
              subtitle={meta.subtitle}
              terminalOpen={terminalOpen}
              onToggleTerminal={() => setTerminalOpen((v) => !v)}
            />

            <main className="flex-1 overflow-y-auto">{renderPage()}</main>

            <TerminalDrawer
              open={terminalOpen}
              onClose={() => setTerminalOpen(false)}
              logs={logs}
              onClear={clear}
              running={running}
              pid={pid}
              onLaunch={handleLaunch}
              onStop={handleLaunch}
              onOpenBrowser={() => push({ level: 'info', text: '>>> 打开浏览器 http://127.0.0.1:8188' })}
              onAiAnalyze={handleAiAnalyze}
              onExportLog={handleExportLog}
            />
          </div>
        </div>
      </ToastProvider>
      </UIProvider>
    </SettingsProvider>
  )
}

/* 十二个工具页占位 —— S3 阶段逐一替换 */
function ToolPlaceholder({ id }) {
  const tool = TOOL_MAP[id]
  const Icon = ICONS[tool?.icon] || ICONS.Boxes
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10">
      <div
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool?.gradient} flex items-center justify-center mb-5 shadow-xl`}
      >
        <Icon size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-black text-[var(--text-main)]">{tool?.label}</h2>
      <p className="mt-2 text-xs text-[var(--text-sub)] max-w-sm leading-relaxed">
        {tool?.desc} — 界面重建中（S3 阶段填充）
      </p>
    </div>
  )
}
