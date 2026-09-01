import { useState } from 'react'
import { Image as ImageIcon, FolderUp, RefreshCw, Trash2, Filter } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { ConfirmModal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { WORKS_TYPE_FILTERS, WORKS_SORT } from '../../config/tools'
import { scanFilesDirectory, MEDIA_EXTS, formatBytes } from '../../lib/envScan'
import { call } from '../../lib/backend'

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
  const [currentDir, setCurrentDir] = useState('')
  const { showToast } = useToast()

  const selectedNames = files.filter((f) => selected[f.name]).map((f) => f.name)

  /*
   * 刷新列表：真实读取用户选择的目录（默认按媒体文件过滤）
   * 文件条目与大小均为真实读取结果，不产生任何虚构条目。
   */
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await scanFilesDirectory(MEDIA_EXTS)
      if (!res) return
      if (!res.ok) {
        showToast('alert', '读取失败', res.reason || '无法读取该目录。')
        return
      }
      setFiles(
        res.files.map((f) => ({
          name: f.name,
          size: f.size,
          /* File 句柄不提供稳定的修改时间，此处不做虚构，UI 显示为 — */
          date: '—',
        }))
      )
      setCurrentDir(res.dir)
      showToast('success', '读取完成', `已从「${res.dir}」真实读取到 ${res.files.length} 个媒体文件。`)
    } catch (e) {
      showToast('alert', '读取失败', e?.message || '读取目录时发生错误。')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleDelete() {
    if (selectedNames.length === 0) {
      showToast('alert', '提示', '请先勾选要删除的文件')
      return
    }
    try {
      const paths = selectedNames.map((n) => `${currentDir.replace(/[\\/]+$/, '')}\\${n}`)
      const r = await call('fs_delete', [paths, currentDir, true], '删除文件需要后端执行文件系统操作')
      const failed = r.failed || []
      showToast(
        failed.length ? 'alert' : 'success',
        failed.length ? '部分删除失败' : '删除完成',
        failed.length
          ? `成功 ${(r.deleted || []).length} 项，失败 ${failed.length} 项：${failed[0]?.error || ''}`
          : `已真实删除 ${(r.deleted || []).length} 项（已移入回收站）`
      )
      setSelected({})
      await handleRefresh()
    } catch (e) {
      showToast('alert', '删除失败', e?.message || '删除时发生错误。')
    }
  }

  function handleUp() {
    showToast('alert', '提示', '当前已在所选目录的根层级')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="glass" size="sm" onClick={handleUp}>
          <FolderUp size={13} />
          上一级
        </Button>
        <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-[11px] font-black">
          {currentDir || '未选择目录'}
        </span>
        <span className="text-[11px] text-[var(--text-sub)]">Ctrl/Shift 多选 · Ctrl+C 复制</span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={13} />
            删除已选({selectedNames.length})
          </Button>
          <Button variant="glass" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? '读取中...' : currentDir ? '刷新' : '选择目录'}
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
              title={currentDir ? '该目录下没有找到媒体文件' : '尚未选择目录'}
              desc={
                currentDir
                  ? `已在「${currentDir}」中扫描完毕，未找到图片或视频文件。`
                  : '点击右上角「选择目录」，选择一个包含图片或视频的文件夹后即可真实读取其中的文件。'
              }
              action={
                currentDir ? undefined : (
                  <Button variant="primary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    选择目录
                  </Button>
                )
              }
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
              {currentDir || '尚未选择目录'}
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
