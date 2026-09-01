import cx from '../../lib/cx'

/*
 * Toggle —— 原版开关
 * 观感：胶囊轨道 + 圆钮滑动，开启态 with 渐变或实色高亮
 */
export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <div className="text-xs font-bold text-[var(--text-main)] leading-snug">{label}</div>
          )}
          {description && (
            <div className="mt-0.5 text-[11px] text-[var(--text-sub)] leading-relaxed">
              {description}
            </div>
          )}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={cx(
          'relative shrink-0 w-11 h-6 rounded-full transition-all duration-300',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  )
}

export default Toggle
