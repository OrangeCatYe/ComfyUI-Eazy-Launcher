import { Moon, RefreshCw, Sun, Terminal, FolderOpen, Volume2, VolumeX, User } from 'lucide-react'
import { useState } from 'react'
import cx from '../../lib/cx'
import { useUI } from '../../store/uiStore'
import { useSettings } from '../../store/settingsStore'

/*
 * TopBar —— 原版顶部栏
 * 左侧：当前页面标题（大字 + 副标题）
 * 右侧：5 个图标按钮（P2 视觉细节待校准，先按语义用 lucide 近似）
 *       依次为 刷新 / 目录 / 声音 / 主题 / 用户
 *       最右为「显示终端」按钮
 */
export function TopBar({ title, subtitle, onToggleTerminal, terminalOpen, onAction }) {
  const { theme, toggleTheme } = useUI()
  const { settings } = useSettings()
  const [refreshing, setRefreshing] = useState(false)
  const [muted, setMuted] = useState(false)

  const iconBtn =
    'press p-2 rounded-xl bg-[var(--bg-glass-strong)] border border-[var(--border-main)] text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] shadow-sm'

  /* 刷新：旋转动画 + 终端日志 */
  function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    onAction?.('topbar-refresh')
    setTimeout(() => setRefreshing(false), 900)
  }

  /* 打开目录：无 comfyRoot 时提示 */
  function handleOpenDir() {
    onAction?.('topbar-open-dir', settings.comfyRoot || '未配置')
  }

  /* 声音开关 */
  function handleToggleSound() {
    setMuted((v) => !v)
    onAction?.('topbar-sound', muted ? '开启' : '静音')
  }

  /* 用户：提示当前为本地模式 */
  function handleUser() {
    onAction?.('topbar-user')
  }

  return (
    <header className="h-[68px] shrink-0 px-6 flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-lg font-black text-[var(--text-main)] truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[11px] font-bold text-[var(--text-sub)] truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleRefresh} className={iconBtn} title="刷新">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button onClick={handleOpenDir} className={iconBtn} title="打开目录">
          <FolderOpen size={15} />
        </button>
        <button onClick={handleToggleSound} className={iconBtn} title={muted ? '取消静音' : '声音'}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <button onClick={toggleTheme} className={iconBtn} title="切换主题">
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button onClick={handleUser} className={iconBtn} title="用户">
          <User size={15} />
        </button>

        <button
          onClick={onToggleTerminal}
          className={cx(
            'press ml-1 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200',
            terminalOpen
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-[var(--bg-glass-strong)] border border-[var(--border-main)] text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] shadow-sm'
          )}
        >
          <Terminal size={14} />
          {terminalOpen ? '隐藏终端' : '显示终端'}
        </button>
      </div>
    </header>
  )
}

export default TopBar
