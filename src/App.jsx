import { useCallback, useMemo, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { TerminalDrawer } from './components/layout/TerminalDrawer'
import { TOOL_MAP } from './config/navigation'
import { UIProvider } from './store/uiStore'
import { ToastProvider } from './components/ui/Toast'
import { createLogger } from './lib/logger'

/*
 * 页面占位组件 —— S1 阶段仅验证骨架，S2/S3 逐个替换为真实页面
 */
function Placeholder({ title, icon: Icon, note }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/20">
        {Icon ? (
          <Icon size={28} className="text-white" />
        ) : (
          <span className="text-white font-black text-lg">KK</span>
        )}
      </div>
      <h2 className="text-xl font-black text-[var(--text-main)]">{title}</h2>
      <p className="mt-2 text-xs text-[var(--text-sub)] max-w-sm leading-relaxed">{note}</p>
    </div>
  )
}

const PAGE_META = {
  home: { title: '首页', subtitle: '设备状态与快捷入口' },
  kernel: { title: '内核管理', subtitle: 'ComfyUI 内核版本与仓库管理' },
  plugins: { title: '插件管理', subtitle: '已安装插件与批量操作' },
  deps: { title: '环境依赖', subtitle: 'Python 依赖检测与快照管理' },
  tools: { title: '实用工具', subtitle: '12 个效率工具，支持长按卡片排序' },
  deploy: { title: '初恋部署', subtitle: '一键部署 ComfyUI 环境' },
  settings: { title: '全局设置', subtitle: '性能优化与软件设置' },
}

export default function App() {
  const [page, setPage] = useState('home')
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [logs, setLogs] = useState([])

  const { push, clear } = useMemo(() => createLogger(setLogs), [])

  const navigate = useCallback((id) => setPage(id), [])

  const meta = useMemo(() => {
    if (page.startsWith('tool:')) {
      const tool = TOOL_MAP[page.slice(5)]
      return { title: tool?.label || '工具', subtitle: tool?.desc || '' }
    }
    return PAGE_META[page] || { title: '', subtitle: '' }
  }, [page])

  return (
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

            <main className="flex-1 overflow-y-auto">
              <Placeholder
                title={meta.title}
                note={`${meta.subtitle} — 界面重建中（S2/S3 阶段填充）`}
              />
            </main>

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
  )
}
