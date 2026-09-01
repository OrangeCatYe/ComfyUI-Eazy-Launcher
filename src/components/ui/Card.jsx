import cx from '../lib/cx'

/*
 * Card —— 原版基础容器
 * 观感：rounded-[2rem] + border + shadow-xl，内部 padding 由调用方控制
 */
export function Card({ className = '', children, padded = true, ...rest }) {
  return (
    <div
      className={cx(
        'bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] shadow-xl',
        padded && 'p-6',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/*
 * SectionTitle —— 原版区块标题
 * 观感：text-xs font-black text-sub uppercase tracking-[0.2em]，常带 14px 图标
 */
export function SectionTitle({ icon: Icon, children, className = '', action }) {
  return (
    <div className={cx('flex items-center justify-between', className)}>
      <h4 className="section-title">
        {Icon && <Icon size={14} />}
        {children}
      </h4>
      {action}
    </div>
  )
}

export default Card
