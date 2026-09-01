import cx from '../../lib/cx'

/*
 * Button —— 原版按钮
 * 五种变体对应截图中的实际用法：
 *   primary  主操作（渐变 indigo，如「一键启动」「保存」）
 *   glass    玻璃拟态次级按钮（原版最多，如「安装轮子.whl」「查询引用插件」）
 *   ghost    无边框纯文字
 *   danger   危险操作（「卸载选中」，hover 变 rose）
 *   outline  描边按钮
 *
 * 原版统一：rounded-xl font-black text-xs + shadow-lg + active:scale-95
 */
const VARIANTS = {
  primary:
    'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border border-indigo-600 shadow-lg shadow-indigo-500/20',
  glass:
    'bg-[var(--bg-glass-strong)] border border-[var(--border-main)] text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] shadow-lg',
  ghost: 'text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]',
  danger:
    'bg-[var(--bg-glass-strong)] hover:bg-rose-600 border border-[var(--border-main)] text-[var(--text-sub)] hover:text-white hover:border-rose-700 shadow-lg',
  outline:
    'border border-[var(--border-strong)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2.5 text-xs',
  lg: 'py-3.5 text-xs',
}

export function Button({
  variant = 'glass',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'press rounded-xl font-black flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        size === 'lg' && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 12 : 14} />
      )}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 12 : 14} />}
    </button>
  )
}

export default Button
