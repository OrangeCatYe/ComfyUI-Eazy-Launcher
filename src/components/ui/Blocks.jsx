import React from 'react'
import cx from '../../lib/cx'

/* 页面主标题区 */
export function PageHeader({ title, desc, children }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-[var(--text-main)] leading-tight">{title}</h2>
        {desc && <p className="mt-1 text-xs text-[var(--text-sub)]">{desc}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

/* 带标题的内容区块 */
export function SectionCard({ title, desc, children, className, bodyClass }) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)]',
        className
      )}
    >
      {(title || desc) && (
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline gap-3">
            {title && <h3 className="section-title">{title}</h3>}
            {desc && <span className="text-[11px] text-[var(--text-sub)]">{desc}</span>}
          </div>
        </div>
      )}
      <div className={cx('px-5 pb-5', bodyClass)}>{children}</div>
    </section>
  )
}

/* 表单行 */
export function FieldRow({ label, hint, children, labelWidth = 'w-36' }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cx('shrink-0', labelWidth)}>
        <div className="text-xs font-bold text-[var(--text-main)]">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-[var(--text-sub)] leading-tight">{hint}</div>}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">{children}</div>
    </div>
  )
}

/* 空状态占位 —— 所有列表默认走此组件 */
export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] flex items-center justify-center mb-3">
          <Icon size={22} className="text-[var(--text-sub)]" />
        </div>
      )}
      <div className="text-sm font-black text-[var(--text-main)]">{title}</div>
      {desc && <div className="mt-1 text-xs text-[var(--text-sub)] max-w-xs leading-relaxed">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* 数据卡 */
export function StatCard({ icon: Icon, label, value, gradient = 'from-indigo-500 to-violet-600' }) {
  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 flex items-center gap-3 shadow-[0_2px_12px_var(--shadow-color)]">
      <div
        className={cx(
          'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
          gradient
        )}
      >
        {Icon && <Icon size={16} className="text-white" />}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[var(--text-sub)] truncate">{label}</div>
        <div className="text-lg font-black tnum text-[var(--text-main)] leading-tight truncate">
          {value}
        </div>
      </div>
    </div>
  )
}

/* 列表页顶部操作条 */
export function Toolbar({ count, countUnit, children }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs font-black text-[var(--text-sub)]">
        {count !== undefined && (
          <>
            <span className="text-[var(--text-main)] tnum">{count}</span> {countUnit}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  )
}
