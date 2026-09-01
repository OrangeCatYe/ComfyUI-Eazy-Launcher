import cx from '../../lib/cx'

/*
 * Badge —— 原版状态标签
 * 截图中出现：有新版本 / 当前版本 / 已在使用 / 本地插件 / 支持视觉 / 本地保存
 */
const TONES = {
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-sub)] border-[var(--border-main)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-transparent',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
}

export function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap',
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon size={10} />}
      {children}
    </span>
  )
}

/*
 * EmptyState —— 空数据占位
 * 用户要求：数据用空状态，后续接真实数据
 */
export function EmptyState({
  icon: Icon,
  title = '暂无数据',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center mb-4">
          <Icon size={24} className="text-[var(--text-sub)]" />
        </div>
      )}
      <p className="text-sm font-black text-[var(--text-main)]">{title}</p>
      {description && (
        <p className="mt-1.5 text-xs text-[var(--text-sub)] leading-relaxed max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/*
 * StatItem —— 键值信息行（用于设备信息、详情面板）
 */
export function StatItem({ label, value, mono = false, tone = 'default' }) {
  const tones = {
    default: 'text-[var(--text-main)]',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
  }
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border-main)] last:border-0">
      <span className="text-[11px] font-bold text-[var(--text-sub)] shrink-0">{label}</span>
      <span className={cx('text-xs font-black text-right truncate', mono && 'tnum', tones[tone])}>
        {value}
      </span>
    </div>
  )
}

export default Badge
