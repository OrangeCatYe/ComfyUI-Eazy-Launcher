import { useState } from 'react'
import { Image as ImageIcon, FolderUp, RefreshCw, Trash2, Filter } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { ConfirmModal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { WORKS_TYPE_FILTERS, WORKS_SORT } from '../../config/tools'

/*
 * 我的作品 —— 依据「我的作品.png」
 *
 * 结构：
 *   1. 顶部：上一级 | 当前目录名(output) | Ctrl/Shift 多选·Ctrl+C 复制 |
 *      删除已选(0) | 刷新
 *   2. 筛选：全部类型 | 最新生成
 *   3. 空状态：暂无文件
 *   4. 底部：当前目录：C:\ComfyUI\ComfyUI\ComfyUI\output
 *
 * 数据策略：空状态优先
 */

export default function MyWorksPage() {
  const [type, setType] = useState(WORKS_TYPE_FILTERS[0])
  const [sort, setSort] = useState(WORKS_SORT[0])

  /* 以下为补齐的交互态（数据仍为空，操作仅做本地反馈） */
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const { showToast } = useToast()

  const selectedNames = files.filter((f) => selected[f.name]).map((f) => f.name)

  function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    showToast('success', '操作成功', '正在读取 output 目录')
    setTimeout(() => setRefreshing(false), 900)
  }

  function handleDelete() {
    if (selectedNames.length === 0) {
      showToast('alert', '提示', '请先勾选要删除的文件')
      return
    }
    setConfirmDel(true)
  }

  function handleUp() {
    showToast('alert', '提示', '当前已在根目录 output')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="glass" size="sm" onClick={handleUp}>
          <FolderUp size={13} />
          上一级
        </Button>
        <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-[11px] font-black">
          output
        </span>
        <span className="text-[11px] text-[var(--text-sub)]">Ctrl/Shift 多选 · Ctrl+C 复制</span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={13} />
            删除已选({selectedNames.length})
          </Button>
          <Button variant="glass" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? '读取中...' : '刷新'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={12} className="text-[var(--text-sub)]" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer"
        >
          {WORKS_TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer"
        >
          {WORKS_SORT.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)]">
        <div className="px-5 py-4">
          {files.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="暂无文件"
              desc="生成的图片与视频会保存在当前目录，点击「刷新」重新读取。"
            />
          ) : (
            <div className="space-y-1">
              {files.map((f) => (
                <label
                  key={f.name}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] cursor-pointer hover:bg-[var(--bg-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected[f.name])}
                    onChange={() => setSelected((s) => ({ ...s, [f.name]: !s[f.name] }))}
                    className="accent-indigo-500 shrink-0"
                  />
                  <ImageIcon size={12} className="text-[var(--text-sub)] shrink-0" />
                  <span className="text-[11px] font-black text-[var(--text-main)] truncate">
                    {f.name}
                  </span>
                  <span className="ml-auto text-[11px] tnum text-[var(--text-sub)]">
                    {f.size}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border-main)]">
          <span className="text-[11px] text-[var(--text-sub)]">
            当前目录：
            <span className="font-mono text-[var(--text-main)]">
              C:\ComfyUI\ComfyUI\ComfyUI\output
            </span>
          </span>
        </div>
      </section>

      <ConfirmModal
        open={confirmDel}
        danger
        onClose={() => setConfirmDel(false)}
        onConfirm={() => {
          setFiles((list) => list.filter((f) => !selected[f.name]))
          setSelected({})
          setConfirmDel(false)
          showToast('success', '操作成功', `已删除 ${selectedNames.length} 个文件`)
        }}
        title="删除文件"
        message={`确认删除已选的 ${selectedNames.length} 个文件？此操作不可撤销。`}
      />
    </div>
  )
}
