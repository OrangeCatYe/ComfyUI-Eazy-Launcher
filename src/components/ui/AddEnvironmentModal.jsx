import { useCallback, useState } from 'react'
import { FolderPlus, FolderOpen, CheckCircle2, AlertTriangle, Terminal, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { scanEnvironmentFromPicker, summarizeScan, emptyScan } from '../../lib/envScan'
import { isBackend, call, tryCall, waitBackend } from '../../lib/backend'

/*
 * 后端模式扫描：
 * Eel 的 app 窗口不支持 File System Access API（showDirectoryPicker 永不返回），
 * 因此后端可用时必须走「原生目录框 → 后端真实扫描」这条链路。
 */
async function scanViaBackend() {
  const picked = await tryCall('dialog_pick_dir', ['选择 ComfyUI 根目录'])
  if (!picked || !picked.path) return null
  const scan = await call('env_scan_root', [picked.path], '扫描目录需要后端支持')
  return {
    ok: Boolean(scan?.ok),
    mode: 'backend',
    rootName: scan?.rootName || picked.path,
    comfyRoot: scan?.comfyRoot || picked.path,
    nested: Boolean(scan?.nested),
    pythonPath: scan?.pythonPath || '',
    pythonSource: scan?.pythonSource || '',
    hasGit: Boolean(scan?.hasGit),
    pluginCount: scan?.pluginCount || 0,
    plugins: scan?.plugins || [],
    modelsDirs: scan?.modelsDirs || [],
    requirements: scan?.requirements ?? null,
    reason: scan?.ok ? '' : '未识别到 ComfyUI 内核特征',
  }
}

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
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const [manual, setManual] = useState(false)
  const [form, setForm] = useState({ comfyRoot: '', pythonPath: '' })

  const reset = useCallback(() => {
    setScanning(false)
    setVerifying(false)
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
      /* 先等 eel.js 就绪，否则会误判为浏览器模式，退回会挂起的 File System Access API */
      const ready = await waitBackend()
      const r = ready ? await scanViaBackend() : await scanEnvironmentFromPicker()
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

  /* 手动填写路径后的校验：复用后端扫描，识别成功则自动补全 Python 路径 */
  const handleVerifyManual = useCallback(async () => {
    const p = form.comfyRoot.trim()
    if (!p || verifying) return
    setVerifying(true)
    onLog?.({ level: 'cmd', text: `\n>>> 校验路径：${p}` })
    try {
      /* eel.js 异步注入，先等它就绪，否则会误判成浏览器模式而降级 */
      const ready = await waitBackend()
      if (!ready) {
        onLog?.({ level: 'warning', text: '>>> 当前非后端模式，无法校验路径，可直接导入。' })
        setResult({ ...emptyScan(), comfyRoot: p, ok: false, reason: '非后端模式下未校验' })
        return
      }
      const scan = await call('env_scan_root', [p], '校验路径需要后端支持')
      const r = {
        ok: Boolean(scan?.ok),
        mode: 'backend',
        rootName: scan?.rootName || p,
        comfyRoot: scan?.comfyRoot || p,
        nested: Boolean(scan?.nested),
        pythonPath: scan?.pythonPath || '',
        pythonSource: scan?.pythonSource || '',
        hasGit: Boolean(scan?.hasGit),
        pluginCount: scan?.pluginCount || 0,
        plugins: scan?.plugins || [],
        modelsDirs: scan?.modelsDirs || [],
        requirements: scan?.requirements ?? null,
        reason: scan?.ok ? '' : '未识别到 ComfyUI 内核特征',
      }
      summarizeScan(r).forEach((line) => onLog?.({ level: 'info', text: ` - ${line}` }))
      if (r.ok) {
        onLog?.({ level: 'success', text: '>>> 路径校验通过，请确认后导入。' })
        setForm({ comfyRoot: r.comfyRoot, pythonPath: r.pythonPath || form.pythonPath })
      } else {
        onLog?.({ level: 'warning', text: `>>> ${r.reason}（仍可直接导入）` })
      }
      setResult(r)
    } catch (e) {
      onLog?.({ level: 'error', text: `>>> 校验失败：${e?.message || e}（仍可直接导入）` })
      setResult({ ...emptyScan(), comfyRoot: p, ok: false, reason: `校验失败：${e?.message || e}` })
    } finally {
      setVerifying(false)
    }
  }, [form.comfyRoot, form.pythonPath, verifying, onLog])

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
            <Button
              variant="primary"
              size="sm"
              onClick={handleImport}
              disabled={!canImport || scanning || verifying}
              title={canImport ? '' : '请先填写或选择 ComfyUI 根目录'}
            >
              导入环境
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-1">
        {/* 第一步：选择文件夹（未扫描时展示引导） */}
        {!result && (
          <div className="border-2 border-dashed border-[var(--border-main)] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
              <FolderPlus size={26} className="text-white" />
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">选择 ComfyUI 文件夹</div>
            <p className="mt-1.5 text-[11px] text-[var(--text-sub)] leading-relaxed max-w-sm mx-auto">
              {scanning
                ? '请在弹出的窗口中选择目录…'
                : '点击下面的按钮，选择你的 ComfyUI 根目录。若目录为整合包的嵌套结构，会自动向下定位到真正的内核目录。也可以直接在下方手动填写路径。'}
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

        {/* 路径表单：始终可见，支持不扫描直接手动填写 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black text-[var(--text-sub)]">
              {result ? '路径信息（可手动修正）' : '或手动填写路径'}
            </div>
            {!result && !scanning && form.comfyRoot.trim() && (
              <button
                onClick={() => void handleVerifyManual()}
                disabled={verifying}
                className="press inline-flex items-center gap-1 text-[11px] font-black text-indigo-500 hover:text-indigo-600 disabled:opacity-50"
              >
                {verifying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {verifying ? '校验中…' : '校验并识别'}
              </button>
            )}
          </div>
          <Field
            label="ComfyUI 根目录"
            value={form.comfyRoot}
            onChange={(v) => {
              setForm((f) => ({ ...f, comfyRoot: v }))
              /* 改动路径后旧结果失效，避免拿着过期的扫描结果导入 */
              if (result) setResult(null)
            }}
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
