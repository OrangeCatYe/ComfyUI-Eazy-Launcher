import { useRef, useState } from 'react'
import { Copy, Play, Square, Trash2, Search, FolderOpen, Settings2, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { Toggle } from '../../components/ui/Toggle'
import { call } from '../../lib/backend'

import { pickScanDirectory, findDuplicates } from '../../lib/dupScan'
import { formatBytes } from '../../lib/envScan'
import { DUP_MODEL_EXTS } from '../../config/tools'
import cx from '../../lib/cx'

/*
 * 检测重复模型 —— 依据「检测重复模型.png」
 *
 * 结构：
 *   1. 顶部：开始检测 / 取消检测
 *   2. 检测方式：同文件名 / 同哈希值
 *   3. 过滤文件格式：.safetensors .ckpt .bin .pt .gguf（多选）
 *   4. 高级选项：扫描路径（可展开）
 *   5. 统计条：已选N项 | 已扫描X个模型文件，显示Y个重复项
 *   6. 底部：全选 + 移动到回收站
 *
 * 数据策略：真实扫描用户选择的目录并计算采样哈希，不产生任何虚构结果。
 */

export default function DupModelPage() {
  const [mode, setMode] = useState('hash')
  const [exts, setExts] = useState(DUP_MODEL_EXTS)
  const [advanced, setAdvanced] = useState(false)
  const [scanPath, setScanPath] = useState('')
  /* 扫描状态机 */
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ scanned: 0, total: 0, current: '' })
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState({})
  /* 取消标记：用户点取消时置真，扫完当前文件即停 */
  const cancelRef = useRef(false)
  const { showToast } = useToast()

  const toggleExt = (e) =>
    setExts((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  /* 开始检测：选目录 → 真实扫描 → 真实哈希比对 */
  async function handleScan() {
    if (scanning) return
    if (exts.length === 0) {
      showToast('alert', '提示', '请至少选择一种文件格式')
      return
    }

    const { canceled, handle, error } = await pickScanDirectory()
    if (canceled) return
    if (error) {
      showToast('alert', '无法开始', error)
      return
    }

    cancelRef.current = false
    setScanning(true)
    setResult(null)
    setSelected({})
    setProgress({ scanned: 0, total: 0, current: '' })
    setScanPath(handle.name)
    showToast(
      'success',
      '开始检测',
      `正在按${mode === 'hash' ? '内容哈希' : '文件名'}扫描「${handle.name}」（${exts.length} 种格式）`
    )

    try {
      const res = await findDuplicates(handle, exts, mode, (p) => {
        if (cancelRef.current) return
        setProgress(p)
      })

      if (cancelRef.current) {
        setScanning(false)
        showToast('alert', '已取消', '检测已取消。')
        return
      }

      setResult(res)
      setScanning(false)

      if (!res.ok) {
        showToast('alert', '检测失败', res.reason || '未知错误')
        return
      }
      if (res.groups.length === 0) {
        showToast(
          'success',
          '检测完成',
          `已真实扫描 ${res.scanned} 个文件，未发现重复项。`
        )
      } else {
        showToast(
          'success',
          '检测完成',
          `已扫描 ${res.scanned} 个文件，发现 ${res.groups.length} 组重复，可释放约 ${formatBytes(res.dupBytes)}。`
        )
      }
    } catch (e) {
      setScanning(false)
      showToast('alert', '检测失败', e?.message || '扫描过程中发生错误')
    }
  }

  function handleCancel() {
    if (!scanning) {
      showToast('alert', '提示', '当前没有正在进行的检测任务')
      return
    }
    cancelRef.current = true
    setScanning(false)
    showToast('alert', '已取消', '检测已取消。')
  }

  /* 全选：每组保留第一个，其余为重复项可勾选 */
  const dupEntries = result
    ? result.groups.flatMap((g) => g.files.slice(1).map((f) => ({ ...f, group: g.key })))
    : []
  const selectedPaths = Object.keys(selected).filter((k) => selected[k])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="primary" size="sm" onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {scanning ? '检测中...' : '开始检测'}
        </Button>
        <Button variant="glass" size="sm" onClick={handleCancel}>
          <Square size={13} />
          取消检测
        </Button>
      </div>

      <SectionCard>
        <div className="space-y-4">
          {/* 检测方式 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black text-[var(--text-main)] w-24 shrink-0">检测方式</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
              {[
                { id: 'name', label: '同文件名' },
                { id: 'hash', label: '同哈希值' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cx(
                    'press px-4 py-1.5 rounded-lg text-[11px] font-black transition-all',
                    mode === m.id
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[var(--text-sub)]">
              {mode === 'hash'
                ? '按文件哈希值比对，结果最准确但耗时较长。'
                : '按文件名比对，速度快但可能误判。'}
            </span>
          </div>

          {/* 过滤文件格式 */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-xs font-black text-[var(--text-main)] w-24 shrink-0 pt-1">
              过滤文件格式
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DUP_MODEL_EXTS.map((e) => {
                const on = exts.includes(e)
                return (
                  <button
                    key={e}
                    onClick={() => toggleExt(e)}
                    className={cx(
                      'press px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all',
                      on
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-[var(--bg-card-lighter)] text-[var(--text-sub)] border-[var(--border-main)] hover:text-[var(--text-main)]'
                    )}
                  >
                    {e}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 高级选项 */}
          <div className="pt-3 border-t border-[var(--border-main)]">
            <div className="flex items-center gap-2">
              <Settings2 size={13} className="text-[var(--text-sub)]" />
              <span className="text-xs font-black text-[var(--text-main)]">高级选项</span>
              <Toggle checked={advanced} onChange={setAdvanced} />
            </div>
            {advanced && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
                  <FolderOpen size={14} className="text-[var(--text-sub)] shrink-0" />
                  <input
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-xs font-mono text-[var(--text-main)] outline-none"
                    placeholder="选择要扫描的模型目录"
                  />
                </div>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) setScanPath(p)
                  }}
                >
                  浏览目录
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 结果区 */}
      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)]">
        <div className="px-5 py-3 flex items-center gap-4 flex-wrap border-b border-[var(--border-main)]">
          <label className="flex items-center gap-2 text-[11px] font-black text-[var(--text-sub)] cursor-pointer">
            <input
              type="checkbox"
              className="accent-indigo-500"
              checked={dupEntries.length > 0 && selectedPaths.length === dupEntries.length}
              onChange={(e) => {
                const next = {}
                if (e.target.checked) dupEntries.forEach((f) => { next[f.path] = true })
                setSelected(next)
              }}
              disabled={dupEntries.length === 0}
            />
            全选{' '}
            <span className="tnum text-[var(--text-main)]">已选 {selectedPaths.length} 项</span>
          </label>
          <span className="text-[11px] text-[var(--text-sub)] ml-auto">
            {scanning ? (
              <>
                正在扫描{' '}
                <span className="tnum text-[var(--text-main)]">
                  {progress.scanned}/{progress.total}
                </span>
                {progress.current && (
                  <span className="ml-1 font-mono"> {progress.current}</span>
                )}
              </>
            ) : (
              <>
                已扫描{' '}
                <span className="tnum text-[var(--text-main)]">{result?.scanned ?? 0}</span>{' '}
                个模型文件，显示{' '}
                <span className="tnum text-[var(--text-main)]">{result?.groups.length ?? 0}</span>{' '}
                个重复组
                {result && result.dupBytes > 0 && (
                  <>
                    ，可释放{' '}
                    <span className="tnum text-[var(--text-main)]">
                      {formatBytes(result.dupBytes)}
                    </span>
                  </>
                )}
              </>
            )}
          </span>
        </div>

        <div className="px-5 py-4">
          {result && result.groups.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {result.groups.map((g) => (
                <div
                  key={g.key + g.files[0].path}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-[var(--border-main)] flex items-center gap-2">
                    <Copy size={12} className="text-indigo-500 shrink-0" />
                    <span className="text-[11px] font-black text-[var(--text-main)] truncate">
                      {g.key}
                    </span>
                    <span className="text-[10px] tnum text-[var(--text-sub)] shrink-0">
                      {g.files.length} 个 · {formatBytes(g.files[0].size)} / 个
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border-main)]">
                    {g.files.map((f, i) => {
                      const isDup = i > 0
                      return (
                        <label
                          key={f.path}
                          className={cx(
                            'flex items-center gap-2.5 px-3 py-2',
                            isDup ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : 'opacity-70'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="accent-indigo-500 shrink-0"
                            disabled={!isDup}
                            checked={Boolean(selected[f.path])}
                            onChange={() =>
                              setSelected((s) => ({ ...s, [f.path]: !s[f.path] }))
                            }
                          />
                          <span className="text-[10px] font-mono text-[var(--text-sub)] truncate flex-1">
                            {f.path}
                          </span>
                          {i === 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 shrink-0">
                              保留
                            </span>
                          )}
                          <span className="text-[10px] tnum text-[var(--text-sub)] shrink-0">
                            {formatBytes(f.size)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Copy}
              title={result ? '未发现重复项' : '暂无重复结果，点击「开始检测」进行扫描'}
              desc={
                result
                  ? `已真实扫描 ${result.scanned} 个文件，未发现${mode === 'hash' ? '内容相同' : '同名'}的模型。`
                  : '点击「开始检测」后选择一个模型目录，将真实遍历并按文件名或内容哈希找出重复项。'
              }
              action={
                result ? undefined : (
                  <Button variant="primary" size="sm" onClick={handleScan} disabled={scanning}>
                    <Play size={13} />
                    开始检测
                  </Button>
                )
              }
            />
          )}
        </div>

        <div className="px-5 py-3 flex justify-end border-t border-[var(--border-main)]">
          <Button
            variant="danger"
            size="sm"
            disabled={selectedPaths.length === 0}
            onClick={async () => {
              try {
                const r = await call(
                  'fs_delete',
                  [selectedPaths, scanPath || null, true],
                  '删除文件需要后端执行文件系统操作'
                )
                const failed = r.failed || []
                showToast(
                  failed.length ? 'alert' : 'success',
                  failed.length ? '部分删除失败' : '删除完成',
                  failed.length
                    ? `成功 ${(r.deleted || []).length} 项，失败 ${failed.length} 项：${failed[0]?.error || ''}`
                    : `已真实移动 ${(r.deleted || []).length} 项到回收站`
                )
                setSelected({})
                await handleScan()
              } catch (e) {
                showToast('alert', '删除失败', e?.message || '删除时发生错误。')
              }
            }}
          >
            <Trash2 size={13} />
            移动到回收站
          </Button>
        </div>
      </section>
    </div>
  )
}
