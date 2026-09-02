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
 *   右：开启日志自动滚动 / AI日志分析 / 生成日志 / 清空日志
 *   底：日志流（等宽字体）
 *
 * 核心交互（截图实证）：
 *   - 从下向上优雅展开：height 0 → h，配合 opacity 过渡
 *   - 未启动时显示「控制台就绪，等待启动...」
 *   - 日志流默认自动滚动到底部；用户主动上滑时暂停自动滚动，
 *     头部浮出「开启日志自动滚动」按钮（带跳动提示），
 *     点击按钮或滑回日志最底部即恢复自动滚动
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
  onResize,
}) {
  const bodyRef = useRef(null)
  /* 是否跟随底部自动滚动 */
  const [autoScroll, setAutoScroll] = useState(true)
  /* 程序自身滚动时置位，避免误判为用户上滑 */
  const programmatic = useRef(false)
  /* 上次 scrollTop：判定用户是否在「向上滚动」 */
  const lastScrollTopRef = useRef(0)
  /* 拖拽中（用于控制过渡动画与全局光标） */
  const [dragging, setDragging] = useState(false)
  /* 拖拽参数：起始 Y 与起始高度 */
  const dragRef = useRef(null)

  /*
   * 拖拽改变终端高度
   *
   * 交互：按住顶部横条上下拖动，向上拖 = 终端变高（内容区变矮）。
   * 用 pointer events（而非 mouse events）以同时支持鼠标与触摸，
   * 并用 setPointerCapture 保证拖出面板范围后仍能跟随。
   */
  const startDrag = useCallback(
    (e) => {
      if (!open) return
      e.preventDefault()
      const startY = e.clientY
      const startH = height
      dragRef.current = { startY, startH }

      setDragging(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* 某些环境不支持指针捕获，忽略即可，move 监听仍能工作 */
      }
    },
    [open, height]
  )

  const onDragMove = useCallback(
    (e) => {
      const d = dragRef.current
      if (!d || !onResize) return
      /* 向上拖动 clientY 变小 → 高度变大，故用 startY - clientY */
      const delta = d.startY - e.clientY
      onResize(d.startH + delta)
    },
    [onResize]
  )

  const endDrag = useCallback((e) => {
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 忽略：未捕获成功时无需释放 */
    }
  }, [])

  /* 键盘可达性：聚焦分隔条后用方向键调整高度，兼顾无障碍 */
  const onDragKeyDown = useCallback(
    (e) => {
      if (!onResize) return
      const step = e.shiftKey ? 40 : 12
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onResize(height + step)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        onResize(height - step)
      }
    },
    [height, onResize]
  )

  /* 新日志到达时，仅在自动滚动模式下贴底 */
  useEffect(() => {
    if (!open || !autoScroll || !bodyRef.current) return
    programmatic.current = true
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    lastScrollTopRef.current = bodyRef.current.scrollTop
    /* 滚动事件在下一帧触发，用定时器复位标记 */
    const t = setTimeout(() => {
      programmatic.current = false
    }, 60)
    return () => clearTimeout(t)
  }, [logs, open, autoScroll])

  const handleScroll = useCallback(() => {
    if (!bodyRef.current) return
    const el = bodyRef.current
    /* 始终更新基准（含程序触发的滚动事件），保证「向上滚动」判定准确 */
    const prev = lastScrollTopRef.current
    lastScrollTopRef.current = el.scrollTop
    /* 程序自身触发的滚动不参与状态判定 */
    if (programmatic.current) return
    /* 距底 24px 内视为「已回到底部」→ 恢复自动滚动 */
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
      setAutoScroll(true)
      return
    }
    /* 只有用户「向上滚动」（scrollTop 变小）才暂停自动滚动 */
    if (el.scrollTop < prev - 2) {
      setAutoScroll(false)
    }
  }, [])

  /* 滚回底部并恢复自动滚动（头部按钮与底部悬浮按钮共用） */
  const scrollToBottom = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    programmatic.current = true
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } catch {
      el.scrollTop = el.scrollHeight
    }
    setAutoScroll(true)
    lastScrollTopRef.current = el.scrollHeight
    setTimeout(() => {
      programmatic.current = false
    }, 400)
  }, [])

  /* 面板切换为打开时重置为贴底 */
  useEffect(() => {
    if (open) {
      setAutoScroll(true)
      lastScrollTopRef.current = bodyRef.current?.scrollTop || 0
    }
  }, [open])

  return (
    <div
      className={cx(
        'shrink-0 border-t border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden ease-out',
        /*
         * 拖拽时必须关掉过渡动画，否则高度变化会「追赶」指针，
         * 手感明显发飘；松手后恢复 300ms 过渡用于展开/收起。
         */
        dragging ? 'transition-none' : 'transition-all duration-300',
        open ? 'opacity-100' : 'h-0 opacity-0 border-t-0'
      )}
      style={{ height: open ? height : 0 }}
    >
      {/*
        拖拽把手：上下拖动改变终端高度。
        cursor-row-resize 给出「可上下拖」的视觉暗示；
        悬停/拖拽时高亮为强调色，让用户知道这里能拖。
      */}
      {open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="拖动调整终端高度"
          tabIndex={0}
          title="拖动调整终端高度（也可用方向键，Shift 加速）"
          onPointerDown={startDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onDragKeyDown}
          className={cx(
            'group relative h-1.5 shrink-0 cursor-row-resize select-none touch-none transition-colors',
            'bg-transparent hover:bg-indigo-500/50',
            dragging && 'bg-indigo-500'
          )}
        >
          {/* 三条短横：视觉上提示「可拖拽区域」，悬停时加深 */}
          <div
            className={cx(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[2px] pointer-events-none',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              dragging && 'opacity-100'
            )}
          >
            <span className="block h-[1px] w-8 rounded bg-white/70" />
            <span className="block h-[1px] w-8 rounded bg-white/70" />
            <span className="block h-[1px] w-8 rounded bg-white/70" />
          </div>
        </div>
      )}

      {/* flex-1 + min-h-0：让头部与日志区自动分配「减去拖拽条后」的剩余高度 */}
      <div className="flex-1 min-h-0 flex flex-col">
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
            {/* 用户上滑暂停自动滚动后浮出；点击恢复贴底跟随 */}
            {!autoScroll && (
              <button
                onClick={scrollToBottom}
                title="开启日志自动滚动"
                className="press inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 animate-bounce-soft"
              >
                <ArrowDownToLine size={11} />
                开启日志自动滚动
              </button>
            )}
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

          {/* 开启日志自动滚动 —— 用户上滑暂停后浮出，带跳动动画 */}
          {!autoScroll && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500 text-white text-[11px] font-black shadow-lg hover:bg-indigo-600 animate-bounce-soft"
            >
              <ArrowDownToLine size={12} />
              开启日志自动滚动
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
