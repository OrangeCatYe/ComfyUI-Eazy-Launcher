import { useCallback, useState } from 'react'
import { FolderPlus, FolderOpen, CheckCircle2, AlertTriangle, Terminal, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { scanEnvironmentFromPicker, summarizeScan, emptyScan } from '../../lib/envScan'

/*
 * 添加本地环境 —— 选择文件夹 → 扫描识别 → 确认导入
 *
 * 设计原则（与「去掉模拟数据」一致）：
 *   - 扫描结果全部来自真实目录读取，读不到就是「未识别」，绝不编造
 *   - 未识别时也允许用户手动填写路径，但会明确标注「未通过校验」
 *   - 每一步都往终端输出真实日志，用户可核对
 */

export function AddEnvironmentModal({ open, onClose, onImport, onLog }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [manual, setManual] = useState(false)
  const [form, setForm] = useState({ comfyRoot: '', pythonPath: '' })

  const reset = useCallback(() => {
    setScanning(false)
    setResult(null)
    setManual(false)
    setForm({ comfyRoot: '', pythonPath: '' })
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose?.()
  }, [reset, onClose])

  const handlePick = useCallback(async () => {
    setScanning(true)
    onLog?.({ level: 'cmd', text: '\n>>> 正在等待选择 ComfyUI 根目录...' })
    try {
      const r = await scanEnvironmentFromPicker()
      if (!r) {
        /* 用户取消 */
        onLog?.({ level: 'warning', text: '操作已取消。' })
        setScanning(false)
        return
      }
      summarizeScan(r).forEach((line) => onLog?.({ level: 'info', text: ` - ${line}` }))
      if (r.ok) {
        onLog?.({ level: 'success', text: '>>> 环境识别成功，请确认后导入。' })
        setForm({ comfyRoot: r.comfyRoot, pythonPath: r.pythonPath })
      } else {
        onLog?.({ level: 'warning', text: `>>> ${r.reason}` })
        onLog?.({ level: 'info', text: '>>> 可切换为手动填写路径。' })
      }
      setResult(r)
    } catch (e) {
      onLog?.({ level: 'error', text: `>>> 扫描失败：${e?.message || e}` })
      setResult({ ...emptyScan(), reason: `扫描失败：${e?.message || e}` })
    } finally {
      setScanning(false)
    }
  }, [onLog])

  const canImport = Boolean(form.comfyRoot?.trim())

  const handleImport = useCallback(() => {
    if (!canImport) return
    onImport?.({
      comfyRoot: form.comfyRoot.trim(),
      pythonPath: form.pythonPath.trim(),
      pluginCount: result?.pluginCount ?? 0,
      plugins: result?.plugins ?? [],
      verified: Boolean(result?.ok),
    })
    onLog?.({ level: 'success', text: `>>> 已导入本地环境：${form.comfyRoot.trim()}` })
    handleClose()
  }, [canImport, form, result, onImport, onLog, handleClose])

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="添加本地环境"
      description="选择已有的 ComfyUI 文件夹，自动识别内核目录、Python 解释器与已装插件"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <span className="text-[11px] text-[var(--text-sub)]">
            {result?.ok ? '识别成功，可直接导入' : '支持未识别时手动填写'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" onClick={handleClose}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={handleImport} disabled={!canImport}>
              导入环境
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-1">
        {/* 第一步：选择文件夹 */}
        {!result && (
          <div className="border-2 border-dashed border-[var(--border-main)] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
              <FolderPlus size={26} className="text-white" />
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">选择 ComfyUI 文件夹</div>
            <p className="mt-1.5 text-[11px] text-[var(--text-sub)] leading-relaxed max-w-sm mx-auto">
              {scanning
                ? '请在弹出的窗口中选择目录…'
                : '点击下面的按钮，选择你的 ComfyUI 根目录。若目录为整合包的嵌套结构，会自动向下定位到真正的内核目录。'}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={handlePick}
              disabled={scanning}
              className="mt-4"
            >
              {scanning ? <Loader2 size={15} className="animate-spin" /> : <FolderOpen size={15} />}
              {scanning ? '等待选择…' : '选择文件夹'}
            </Button>
            {scanning && (
              <p className="mt-2 text-[10px] text-[var(--text-sub)]">
                若未看到选择窗口，请检查浏览器是否拦截了弹窗。
              </p>
            )}
          </div>
        )}

        {/* 第二步：展示扫描结果 */}
        {result && (
          <div className="space-y-3">
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                result.ok
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-amber-500/40 bg-amber-500/5'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={17} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-black ${
                    result.ok ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {result.ok ? '环境识别成功' : '未能自动识别'}
                </div>
                <div className="mt-1 space-y-0.5">
                  {summarizeScan(result).map((line, i) => (
                    <div key={i} className="text-[11px] text-[var(--text-sub)] font-mono break-all">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 识别出的插件列表（真实数据） */}
            {result.ok && result.plugins.length > 0 && (
              <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] p-3">
                <div className="text-[11px] font-black text-[var(--text-main)] mb-2">
                  已装插件（{result.pluginCount}）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.plugins.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-mono"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 路径表单：自动填充，可手动修正 */}
            <div className="space-y-3">
              <Field
                label="ComfyUI 根目录"
                value={form.comfyRoot}
                onChange={(v) => setForm((f) => ({ ...f, comfyRoot: v }))}
                placeholder="例如：C:\ComfyUI\ComfyUI\ComfyUI"
                required
              />
              <Field
                label="主 Python 路径"
                value={form.pythonPath}
                onChange={(v) => setForm((f) => ({ ...f, pythonPath: v }))}
                placeholder="例如：C:\ComfyUI\ComfyUI\standalone-env\python.exe"
              />
            </div>

            <button
              onClick={() => {
                reset()
                handlePick()
              }}
              className="press inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-500 hover:text-indigo-600"
            >
              <FolderPlus size={13} />
              重新选择目录
            </button>
          </div>
        )}

        <div className="flex items-start gap-2 pt-1 border-t border-[var(--border-main)]">
          <Terminal size={13} className="text-[var(--text-sub)] shrink-0 mt-0.5" />
          <p className="text-[10px] text-[var(--text-sub)] leading-relaxed">
            扫描过程与结果会完整输出到下方终端，可随时核对。所有信息均来自你选择的真实目录，不包含任何预置示例数据。
          </p>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <div className="text-[11px] font-black text-[var(--text-sub)] mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-sub)] placeholder:font-sans focus:outline-none focus:border-indigo-400"
      />
    </label>
  )
}
