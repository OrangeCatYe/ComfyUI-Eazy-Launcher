import { useState } from 'react'
import { Copy, Play, Square, Trash2, Search, FolderOpen, Settings2, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { pickDirectory } from '../../lib/picker'
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
 *   5. 统计条：已选N项 | 已扫描0个模型文件，显示0个重复项，
 *      已遍历目录0个，待处理目录0个
 *   6. 底部：全选 + 移动到回收站
 *
 * 数据策略：空状态优先
 */

export default function DupModelPage() {
  const [mode, setMode] = useState('hash')
  const [exts, setExts] = useState(DUP_MODEL_EXTS)
  const [advanced, setAdvanced] = useState(false)
  const [scanPath, setScanPath] = useState('C:\\ComfyUI\\ComfyUI\\ComfyUI\\models')
  /* 以下为补齐的扫描状态机 */
  const [scanning, setScanning] = useState(false)
  const { showToast } = useToast()

  const toggleExt = (e) =>
    setExts((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  /* 开始检测：校验格式后进入扫描态 */
  function handleScan() {
    if (scanning) return
    if (exts.length === 0) {
      showToast('alert', '提示', '请至少选择一种文件格式')
      return
    }
    setScanning(true)
    showToast(
      'success',
      '操作成功',
      `开始按${mode === 'hash' ? '哈希值' : '文件名'}检测重复模型（${exts.length} 种格式）`
    )
    /* 无后端阶段：本地模拟扫描耗时 */
    setTimeout(() => {
      setScanning(false)
      showToast('success', '操作成功', '检测完成，未发现重复模型')
    }, 1500)
  }

  function handleCancel() {
    if (!scanning) {
      showToast('alert', '提示', '当前没有正在进行的检测任务')
      return
    }
    setScanning(false)
    showToast('success', '操作成功', '检测已取消')
  }

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
            <input type="checkbox" className="accent-indigo-500" />
            全选 <span className="tnum text-[var(--text-main)]">已选 0 项</span>
          </label>
          <span className="text-[11px] text-[var(--text-sub)] ml-auto">
            已扫描 <span className="tnum text-[var(--text-main)]">0</span> 个模型文件，显示{' '}
            <span className="tnum text-[var(--text-main)]">0</span> 个重复项，已遍历目录{' '}
            <span className="tnum text-[var(--text-main)]">0</span> 个，待处理目录{' '}
            <span className="tnum text-[var(--text-main)]">0</span> 个
          </span>
        </div>

        <div className="px-5 py-4">
          <EmptyState
            icon={Copy}
            title="暂无重复结果，点击「开始检测」进行扫描"
            desc="扫描会遍历所选目录下的模型文件，按文件名或哈希值找出重复项。"
          />
        </div>

        <div className="px-5 py-3 flex justify-end border-t border-[var(--border-main)]">
           <Button
            variant="danger"
            size="sm"
            onClick={() =>
              showToast('alert', '提示', '请先扫描并勾选要移动到回收站的重复模型。')
            }
          >
            <Trash2 size={13} />
            移动到回收站
          </Button>
        </div>
      </section>
    </div>
  )
}
