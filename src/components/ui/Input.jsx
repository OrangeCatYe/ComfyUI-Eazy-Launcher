import { Search, X } from 'lucide-react'
import cx from '../../lib/cx'

/*
 * SearchInput —— 原版搜索框
 * 观感：左侧放大镜图标，rounded-xl，placeholder 为 text-sub
 * 有值时右侧出现清除按钮
 */
export function SearchInput({ value, onChange, placeholder = '搜索...', className = '' }) {
  return (
    <div className={cx('relative', className)}>
      <Search
        size={14}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-sub)] pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cx(
          'w-full pl-9 pr-9 py-2.5 rounded-xl text-xs',
          'bg-[var(--bg-card-lighter)] border border-[var(--border-main)]',
          'text-[var(--text-main)] placeholder:text-[var(--text-sub)]',
          'outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]',
          'transition-all duration-200'
        )}
      />
      {value && (
        <button
          onClick={() => onChange?.('')}
          className="press absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-sub)] hover:text-[var(--text-main)]"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

/*
 * TextInput / TextArea —— 原版表单控件
 * 观感与搜索框一致，统一圆角、描边、聚焦态
 */
export function TextInput({ className = '', ...rest }) {
  return (
    <input
      className={cx(
        'w-full px-3.5 py-2.5 rounded-xl text-xs',
        'bg-[var(--bg-card-lighter)] border border-[var(--border-main)]',
        'text-[var(--text-main)] placeholder:text-[var(--text-sub)]',
        'outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]',
        'transition-all duration-200',
        className
      )}
      {...rest}
    />
  )
}

export function TextArea({ className = '', rows = 4, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cx(
        'w-full px-3.5 py-2.5 rounded-xl text-xs leading-relaxed resize-y',
        'bg-[var(--bg-card-lighter)] border border-[var(--border-main)]',
        'text-[var(--text-main)] placeholder:text-[var(--text-sub)]',
        'outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]',
        'transition-all duration-200',
        className
      )}
      {...rest}
    />
  )
}

/*
 * Field —— 表单字段容器（标签 + 控件 + 说明）
 */
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-black text-[var(--text-main)]">{label}</label>
      )}
      {children}
      {hint && <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">{hint}</p>}
    </div>
  )
}

export default SearchInput
