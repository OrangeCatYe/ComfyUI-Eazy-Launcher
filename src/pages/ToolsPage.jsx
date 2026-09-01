import { useEffect, useRef, useState } from 'react'
import cx from '../lib/cx'
import { readLS, writeLS, LS } from '../lib/storage'

/*
 * 实用工具 —— 依据「实用工具.png」
 *
 * 结构：卡片网格，每张卡含 图标 / 标题 / 描述 / 「点击开始使用」
 *
 * 排序：长按 400ms 进入拖拽态，拖动到目标卡片上方即插入，
 * 顺序持久化到 localStorage key = kk_tools_hub_order（沿用原版键名）。
 *
 * 数据策略：卡片为静态注册表，无空状态
 */

const LONG_PRESS_MS = 400

export default function ToolsPage({ tools, onOpen }) {
  /*
   * 顺序 = 持久化的 id 列表过滤出仍存在的工具，再补齐注册表里新增的工具。
   * 这样即使注册表后续加项，也不会被旧的顺序数据吞掉。
   */
  const [order, setOrder] = useState(() => {
    const saved = readLS(LS.TOOLS_ORDER, [])
    const ids = Array.isArray(saved) ? saved : []
    const known = tools.filter((t) => ids.includes(t.id))
    const added = tools.filter((t) => !ids.includes(t.id))
    return [...known, ...added]
  })
  /* 注册表变化时同步补齐（如后续新增工具） */
  useEffect(() => {
    setOrder((prev) => {
      const missing = tools.filter((t) => !prev.some((p) => p.id === t.id))
      return missing.length ? [...prev, ...missing] : prev
    })
  }, [tools])

  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const pressTimer = useRef(null)
  const didDrag = useRef(false)

  /* 松手/离开时清理 */
  useEffect(() => {
    if (!dragId) return
    const cancel = () => {
      setDragId(null)
      setOverId(null)
    }
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [dragId])

  /* 进入拖拽态：长按计时 */
  function startPress(id) {
    didDrag.current = false
    pressTimer.current = setTimeout(() => {
      setDragId(id)
    }, LONG_PRESS_MS)
  }

  /* 取消长按：未到阈值就松手/移动 */
  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  /* 拖拽经过某卡片：记录插入目标 */
  function handleEnter(id) {
    if (!dragId || id === dragId) return
    setOverId(id)
  }

  /* 落位：把 dragId 插到 overId 位置 */
  function commitDrop() {
    if (dragId && overId && dragId !== overId) {
      setOrder((prev) => {
        const next = prev.filter((t) => t.id !== dragId)
        const idx = next.findIndex((t) => t.id === overId)
        const moved = prev.find((t) => t.id === dragId)
        if (idx < 0 || !moved) return prev
        next.splice(idx, 0, moved)
        writeLS(LS.TOOLS_ORDER, next.map((t) => t.id))
        return next
      })
      didDrag.current = true
    }
    setDragId(null)
    setOverId(null)
  }

  /* 点击打开工具：刚拖拽完的那一次不触发 */
  function handleOpen(tool) {
    if (didDrag.current) {
      didDrag.current = false
      return
    }
    onOpen(tool)
  }

  return (
    <div className="p-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {order.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            dragging={dragId === tool.id}
            dropTarget={overId === tool.id && dragId !== tool.id}
            onOpen={handleOpen}
            onPressStart={() => startPress(tool.id)}
            onPressCancel={cancelPress}
            onEnter={() => handleEnter(tool.id)}
            onDrop={commitDrop}
            anyDragging={Boolean(dragId)}
          />
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] text-[var(--text-sub)]">
        长按卡片可拖拽排序，顺序会自动保存。
      </p>
    </div>
  )
}

function ToolCard({
  tool,
  onOpen,
  onPressStart,
  onPressCancel,
  onEnter,
  onDrop,
  dragging,
  dropTarget,
  anyDragging,
}) {
  return (
    <div
      data-tool-card-id={tool.id}
      onClick={() => onOpen(tool)}
      onPointerDown={onPressStart}
      onPointerUp={() => {
        onPressCancel()
        onDrop()
      }}
      onPointerMove={onPressCancel}
      onPointerEnter={onEnter}
      className={cx(
        'press group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-5 cursor-pointer',
        dragging
          ? 'border-indigo-500 opacity-50 scale-[0.98] shadow-[0_8px_32px_var(--shadow-color)]'
          : dropTarget
            ? 'border-indigo-400 ring-2 ring-indigo-400/40'
            : 'border-[var(--border-main)] hover:border-indigo-400/50 hover:shadow-[0_8px_32px_var(--shadow-color)]',
        anyDragging && 'select-none'
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cx(
            'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg',
            tool.gradient
          )}
        >
          <tool.icon size={22} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-[var(--text-main)] leading-snug">{tool.label}</h3>
          <p className="mt-1.5 text-xs text-[var(--text-sub)] leading-relaxed">{tool.desc}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
        点击开始使用
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>

      {tool.kind === 'action' && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[10px] font-black text-[var(--text-sub)]">
          外链
        </span>
      )}
    </div>
  )
}
