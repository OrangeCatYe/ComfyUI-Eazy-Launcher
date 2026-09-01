import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Eraser,
  Terminal,
  X,
  ArrowDownToLine,
  Sparkles,
  FileDown,
  Square,
  Globe,
} from 'lucide-react'
import cx from '../../lib/cx'

/*
 * TerminalDrawer —— 原版底部终端面板
 *
 * 依据「终端 - 未启动.png」「终端 启动后 - 日志流.png」
 *
 * 布局（原版为右侧栏，本项目为底部展开，功能对齐）：
 *   左：启动内核 / 停止运行 / 打开浏览器  +  # PID: --
 *   右：AI日志分析 / 生成日志 / 清空日志
 *   底：日志流（等宽字体）
 *
 * 核心交互（截图实证）：
 *   - 从下向上优雅展开：height 0 → h，配合 opacity 过渡
 *   - 未启动时显示「控制台就绪，等待启动...」
 *   - 日志流滚动时，若用户上滑离开底部，右下角浮出
 *     「恢复自动滚动」按钮，按钮带上下跳动动画
 *   - 用户滑回底部则自动恢复自动滚动，按钮隐藏
 */

/* 底色按级别着色 */
const LEVEL_CLASS = {
  info: 'text-[var(--text-main)] opacity-80',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--text-warning)]',
  error: 'text-[var(--danger)]',
  cmd: 'text-[var(--accent)] font-bold',
  time: 'text-[var(--text-sub)]',
}

export function TerminalDrawer({
  open,
  onClose,
  logs = [],
  onClear,
  height = 300,
  running = false,
  pid = null,
  onLaunch,
  onStop,
  onOpenBrowser,
  onAiAnalyze,
  onExportLog,
}) {
  const bodyRef = useRef(null)
  /* 是否跟随底部自动滚动 */
  const [autoScroll, setAutoScroll] = useState(true)
  /* 程序自身滚动时置位，避免误判为用户上滑 */
  const programmatic = useRef(false)

  /* 新日志到达时，仅在自动滚动模式下贴底 */
  useEffect(() => {
    if (!open || !autoScroll || !bodyRef.current) return
    programmatic.current = true
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    /* 滚动事件在下一帧触发，用定时器复位标记 */
    const t = setTimeout(() => {
      programmatic.current = false
    }, 60)
    return () => clearTimeout(t)
  }, [logs, open, autoScroll])

  const handleScroll = useCallback(() => {
    if (programmatic.current || !bodyRef.current) return
    const el = bodyRef.current
    /* 距底 24px 内视为「已回到底部」 */
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    setAutoScroll(atBottom)
  }, [])

  /* 滚回底部 */
  const scrollToBottom = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    programmatic.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setAutoScroll(true)
    setTimeout(() => {
      programmatic.current = false
    }, 400)
  }, [])

  /* 面板切换为打开时重置为贴底 */
  useEffect(() => {
    if (open) setAutoScroll(true)
  }, [open])

  return (
    <div
      className={cx(
        'shrink-0 border-t border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden transition-all duration-300 ease-out',
        open ? 'opacity-100' : 'h-0 opacity-0 border-t-0'
      )}
      style={{ height: open ? height : 0 }}
    >
      <div className="h-full flex flex-col">
        {/* 头部：运行控制 + 日志操作 */}
        <div className="h-10 shrink-0 px-4 flex items-center justify-between gap-3 border-b border-[var(--border-main)] bg-[var(--bg-card-lighter)]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={running ? onStop : onLaunch}
              className="press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-[11px] font-black hover:bg-indigo-600"
            >
              {running ? <Square size={11} /> : <Terminal size={11} />}
              {running ? '停止运行' : '启动内核'}
            </button>

            <span className="text-[11px] font-black text-[var(--text-sub)] tnum shrink-0">
              #PID:{pid ?? '--'}
            </span>

            {running && (
              <button
                onClick={onOpenBrowser}
                className="press inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
              >
                <Globe size={11} />
                打开浏览器
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <HeadBtn icon={Sparkles} label="AI日志分析" onClick={onAiAnalyze} />
            <HeadBtn icon={FileDown} label="生成日志" onClick={onExportLog} />
            <HeadBtn icon={Eraser} label="清空日志" onClick={onClear} />
            <button
              onClick={onClose}
              className="press p-1.5 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
              title="隐藏终端"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 日志流 */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={bodyRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-4 font-mono text-[11px] leading-relaxed"
            style={{ background: 'var(--bg-main)' }}
          >
            {logs.length === 0 ? (
              <div className="text-[var(--text-sub)] opacity-60">
                控制台就绪，等待启动...
              </div>
            ) : (
              logs.map((line, i) => (
                <LogLine key={i} line={line} />
              ))
            )}
          </div>

          {/* 恢复自动滚动 —— 离开底部时浮出，带跳动动画 */}
          {!autoScroll && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500 text-white text-[11px] font-black shadow-lg hover:bg-indigo-600 animate-bounce-soft"
            >
              <ArrowDownToLine size={12} />
              恢复自动滚动
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* 头部图标按钮 */
function HeadBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="press inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
    >
      <Icon size={11} />
      {label}
    </button>
  )
}

/* 单行日志：支持 {level,text} 对象或纯字符串 */
function LogLine({ line }) {
  const text = typeof line === 'string' ? line : line?.text ?? ''
  const level = typeof line === 'string' ? null : line?.level

  let cls = 'text-[var(--text-main)] opacity-80'
  if (level) {
    cls = LEVEL_CLASS[level] || cls
  } else if (text.startsWith('>>>')) {
    cls = LEVEL_CLASS.cmd
  } else if (text.startsWith('🔍')) {
    cls = 'text-[var(--info)]'
  } else if (text.startsWith('📦')) {
    cls = 'text-[var(--text-main)] font-bold'
  } else if (text.startsWith(' - ')) {
    cls = 'text-[var(--text-sub)] pl-3'
  } else if (text.includes('失败') || text.includes('错误')) {
    cls = LEVEL_CLASS.error
  } else if (text.includes('完成') || text.includes('成功')) {
    cls = LEVEL_CLASS.success
  }

  return <div className={cx('whitespace-pre-wrap break-all', cls)}>{text || ' '}</div>
}

export default TerminalDrawer
