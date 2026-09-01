import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Trash2, ArrowUpCircle, PackagePlus, AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

/*
 * 恢复快照依赖 —— 页面内差异表
 *
 * 依据 openspec/spec/terminal.md §4.1
 *
 * 这是三个终端功能中**唯一**在页面内渲染 UI 的：
 * 环境比较工具 / 查询引用插件 均为纯终端输出，不要为它们做弹窗。
 *
 * 差异结构：
 *   diff = { remove, update, install, localWhl, snapshotCount,
 *            snapshotMeta, currentMeta, versionMismatch }
 *
 * 渲染「待移除 / 待更新 / 待安装」三个分组，每项带 checkbox，默认全选。
 * 底部按钮「开始恢复」，显示已选数量。
 */

/* 把差异条目统一成 { key, text }，便于勾选 */
function toItems(arr, kind) {
  if (!Array.isArray(arr)) return []
  return arr.map((it) => {
    if (typeof it === 'string') {
      return { key: `${kind}:${it}`, text: it }
    }
    /* update 项为 { name, from, to } */
    return { key: `${kind}:${it.name}`, text: `${it.name}: ${it.from} → ${it.to}` }
  })
}

export function SnapshotDiffModal({ open, diff, onClose, onConfirm }) {
  const [selected, setSelected] = useState({})

  /* 每次打开/换差异时重置为全选（规范：默认全选） */
  useEffect(() => {
    if (!open || !diff) return
    const all = {}
    ;[
      ...toItems(diff.remove, 'remove'),
      ...toItems(diff.update, 'update'),
      ...toItems(diff.install, 'install'),
    ].forEach((i) => {
      all[i.key] = true
    })
    setSelected(all)
  }, [open, diff])

  const groups = useMemo(() => {
    if (!diff) return []
    return [
      {
        id: 'remove',
        title: '待移除',
        icon: Trash2,
        tone: 'text-[var(--danger)]',
        items: toItems(diff.remove, 'remove'),
      },
      {
        id: 'update',
        title: '待更新',
        icon: ArrowUpCircle,
        tone: 'text-[var(--warning)]',
        items: toItems(diff.update, 'update'),
      },
      {
        id: 'install',
        title: '待安装',
        icon: PackagePlus,
        tone: 'text-[var(--success)]',
        items: toItems(diff.install, 'install'),
      },
    ].filter((g) => g.items.length > 0)
  }, [diff])

  const selectedCount = Object.values(selected).filter(Boolean).length
  const totalCount = Object.keys(selected).length

  if (!diff) return null

  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }))

  const toggleGroup = (group, checked) => {
    setSelected((s) => {
      const next = { ...s }
      group.items.forEach((i) => {
        next[i.key] = checked
      })
      return next
    })
  }

  /* 提交：按分组收集已选名称 */
  const handleConfirm = () => {
    const pick = (arr, kind) =>
      toItems(arr, kind)
        .filter((i) => selected[i.key])
        .map((i) => i.key.slice(`${kind}:`.length))

    onConfirm({
      remove: pick(diff.remove, 'remove'),
      update: pick(diff.update, 'update'),
      install: pick(diff.install, 'install'),
    })
  }

  const hasVersionMismatch = (diff.versionMismatch || []).length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="恢复快照依赖"
      description={
        diff.snapshotMeta
          ? `快照 ${diff.snapshotMeta.version}（${diff.snapshotMeta.date}）→ 当前 ${diff.currentMeta?.version || '未知'}`
          : '确认要恢复的依赖变更'
      }
      size="lg"
      footer={
        <>
          <Button variant="glass" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
          >
            <RotateCcw size={13} />
            开始恢复（已选 {selectedCount}/{totalCount}）
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        {/* 概览 */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-[var(--text-sub)]">
          {diff.snapshotCount !== undefined && (
            <span className="px-2 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
              快照依赖 <b className="text-[var(--text-main)] tnum">{diff.snapshotCount}</b> 个
            </span>
          )}
          {groups.map((g) => (
            <span
              key={g.id}
              className="px-2 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)]"
            >
              {g.title} <b className="text-[var(--text-main)] tnum">{g.items.length}</b>
            </span>
          ))}
        </div>

        {/* 版本不匹配告警 */}
        {hasVersionMismatch && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              以下包的版本与快照不一致，恢复时将被强制对齐：
              <b className="font-mono"> {diff.versionMismatch.join('、')}</b>
            </div>
          </div>
        )}

        {/* 三个分组 */}
        {groups.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-sub)]">
            当前环境与快照一致，无需恢复任何依赖。
          </div>
        ) : (
          groups.map((g) => {
            const allChecked = g.items.every((i) => selected[i.key])
            const someChecked = g.items.some((i) => selected[i.key])
            return (
              <div
                key={g.id}
                className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3.5 py-2 border-b border-[var(--border-main)]">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked
                    }}
                    onChange={(e) => toggleGroup(g, e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                  />
                  <g.icon size={13} className={g.tone} />
                  <span className="text-xs font-black text-[var(--text-main)]">{g.title}</span>
                  <span className="text-[11px] text-[var(--text-sub)] tnum">
                    {g.items.filter((i) => selected[i.key]).length}/{g.items.length}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-main)]">
                  {g.items.map((i) => (
                    <label
                      key={i.key}
                      className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-[var(--bg-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selected[i.key])}
                        onChange={() => toggle(i.key)}
                        className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] font-mono text-[var(--text-main)] break-all">
                        {i.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}

export default SnapshotDiffModal
