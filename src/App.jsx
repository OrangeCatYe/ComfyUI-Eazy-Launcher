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

const PAGE_META = {
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
        return <HomePage config={null} onLaunch={() => push({ level: 'info', text: '>>> 一键启动（待接入后端）' })} />
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
        return <DepsPage onAction={handleDepsAction} />
      case 'tools':
        return <ToolsPage tools={TOOLS_WITH_ICONS} onOpen={openTool} />
      case 'deploy':
        return <DeployPage onPickDir={() => push({ level: 'info', text: '>>> 选择部署目录' })} onDeploy={() => push({ level: 'info', text: '>>> 开始部署' })} />
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
    }
    push({ level: 'info', text: map[name] || `>>> ${name}` })
    setTerminalOpen(true)
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
