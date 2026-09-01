import { createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

/*
 * Toast —— 原版提示
 * 截图实证文案形态：
 *   操作成功 / 回滚成功（无需安装依赖）   + 确定
 *   提示 / 请先输入要查询的库名
 * 标题 + 说明两行，底部单个确定按钮
 */
const ToastCtx = createContext(null)

const ICONS = {
  success: CheckCircle2,
  alert: AlertTriangle,
  error: XCircle,
  info: Info,
}

const COLORS = {
  success: 'text-emerald-500',
  alert: 'text-amber-500',
  error: 'text-rose-500',
  info: 'text-sky-500',
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message })
  }, [])

  const close = useCallback(() => setToast(null), [])

  return (
    <ToastCtx.Provider value={{ showToast, close }}>
      {children}
      {toast && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl animate-fade-in" onClick={close} />
          <div className="relative w-full max-w-sm rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-modal)] shadow-2xl p-6 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              {(() => {
                const Icon = ICONS[toast.type] || Info
                return <Icon size={34} className={COLORS[toast.type] || COLORS.info} />
              })()}
              <h3 className="mt-3 text-base font-black text-[var(--text-main)]">{toast.title}</h3>
              {toast.message && (
                <p className="mt-1.5 text-xs text-[var(--text-sub)] leading-relaxed">
                  {toast.message}
                </p>
              )}
              <button
                onClick={close}
                className="press mt-5 w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default ToastProvider
