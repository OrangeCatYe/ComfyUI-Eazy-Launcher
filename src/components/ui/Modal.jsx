import { useEffect } from 'react'
import { X } from 'lucide-react'
import cx from '../../lib/cx'

/*
 * Modal —— 原版弹窗
 * 观感：遮罩 backdrop-blur-2xl + 居中卡 rounded-[2rem]，标题下常带一行说明文字
 * 底部按钮区：取消（玻璃）+ 主操作（渐变）
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = 'md',
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-2xl animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cx(
          'relative w-full rounded-[2rem] border border-[var(--border-main)]',
          'bg-[var(--bg-modal)] shadow-2xl animate-scale-in overflow-hidden',
          widths[size]
        )}
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
              <Icon size={16} className="text-[var(--accent)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-[var(--text-main)]">{title}</h3>
            {description && (
              <p className="mt-1 text-xs text-[var(--text-sub)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="press p-1.5 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
          >
            <X size={16} />
          </button>
        </div>

        {children && <div className="px-6 pb-2 max-h-[60vh] overflow-y-auto">{children}</div>}

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 mt-2 bg-[var(--bg-card-lighter)] border-t border-[var(--border-main)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/*
 * ConfirmModal —— 原版确认弹窗
 * 截图实证：插件「切换」为「取消 / 确认」两按钮，无图标
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="press px-5 py-2.5 rounded-xl font-black text-xs bg-[var(--bg-glass-strong)] border border-[var(--border-main)] text-[var(--text-sub)] hover:bg-[var(--bg-hover)]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cx(
              'press px-5 py-2.5 rounded-xl font-black text-xs text-white shadow-lg',
              danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
            )}
          >
            {confirmText}
          </button>
        </>
      }
    >
      {message && <p className="text-xs text-[var(--text-sub)] leading-relaxed pb-2">{message}</p>}
    </Modal>
  )
}

export default Modal
