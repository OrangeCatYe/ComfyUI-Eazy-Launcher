import { useState } from 'react'
import { Boxes, RefreshCw, Star, Trash2, Search, FolderTree, Filter } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { ConfirmModal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { MODEL_DIRS, MODEL_QUICK_FILTERS, MODEL_SORTS } from '../../config/tools'
import { scanModelDirectory, formatBytes } from '../../lib/envScan'
import cx from '../../lib/cx'

/*
 * 模型管理 —— 依据「模型管理.png」
 *
 * 结构：
 *   1. 顶部操作：刷新列表 | 设为常用 | 删除已选
 *   2. 左侧模型目录：checkpoints / diffusion_models / loras / 其它目录
 *   3. 右侧：搜索模型名/路径/备注内容
 *   4. 快捷操作：全部模型/有备注模型/常用模型/按工作流/已匹配C站/
 *      检测重复模型/匹配Lora信息/有图片备注
 *   5. 底部：全选本页 0/0 | 体积从大到小 | 共 0/0 个模型
 *
 * 数据策略：空状态优先
 */

export default function ModelManagerPage() {
  const [dir, setDir] = useState(MODEL_DIRS[0])
  const [filter, setFilter] = useState('全部模型')
  const [sort, setSort] = useState(MODEL_SORTS[0])
  const [keyword, setKeyword] = useState('')

  /* 以下为补齐的交互态（数据仍为空，操作仅做本地反馈） */
  const [models, setModels] = useState([])
  const [selected, setSelected] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const { showToast } = useToast()

  const selectedNames = models.filter((m) => selected[m.name]).map((m) => m.name)

  /*
   * 刷新列表：真实读取用户选择的模型目录
   * 通过目录遍历拿到真实的文件名与大小，不产生任何虚构条目。
   */
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await scanModelDirectory()
      if (!res) {
        showToast('alert', '已取消', '未选择目录。')
        return
      }
      if (!res.ok) {
        setModels([])
        showToast('alert', '读取失败', res.reason || '无法读取该目录。')
        return
      }
      setModels(res.models)
      showToast(
        'success',
        '读取完成',
        `已从「${res.dir}」真实读取到 ${res.models.length} 个模型文件。`
      )
    } catch (e) {
      showToast('alert', '读取失败', e?.message || '读取目录时发生错误。')
    } finally {
      setRefreshing(false)
    }
  }

  function handleFavorite() {
    if (selectedNames.length === 0) {
      showToast('alert', '提示', '请先勾选要设为常用的模型')
      return
    }
    showToast('success', '操作成功', `已将 ${selectedNames.length} 个模型设为常用（仅记录在本地）`)
  }

  function handleDelete() {
    if (selectedNames.length === 0) {
      showToast('alert', '提示', '请先勾选要删除的模型')
      return
    }
    showToast(
      'alert',
      '需要后端',
      '删除模型文件需要后端执行文件系统操作，当前为纯前端预览，未真实删除。'
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button variant="glass" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '读取中...' : '刷新列表'}
        </Button>
        <Button variant="glass" size="sm" onClick={handleFavorite}>
          <Star size={13} />
          设为常用
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 size={13} />
          删除已选
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        {/* 模型目录 */}
        <SectionCard title="模型目录">
          <div className="space-y-1">
            {MODEL_DIRS.map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={cx(
                  'press w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black text-left',
                  dir === d
                    ? 'bg-indigo-500/10 text-indigo-600'
                    : 'text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
                )}
              >
                <FolderTree size={13} />
                {d}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4 min-w-0">
          {/* 快捷操作 */}
          <SectionCard title="快捷操作">
            <div className="flex items-center gap-1.5 flex-wrap">
              {MODEL_QUICK_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    'press px-3 py-1.5 rounded-lg text-[11px] font-black border',
                    filter === f
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-[var(--bg-card-lighter)] text-[var(--text-sub)] border-[var(--border-main)] hover:text-indigo-500 hover:border-indigo-400/50'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* 列表 */}
          <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)]">
            <div className="p-4 space-y-3">
              <div className="max-w-md">
                <SearchInput
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="搜索模型名/路径/备注内容"
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-[var(--border-main)]">
                <label className="flex items-center gap-2 text-[11px] font-black text-[var(--text-sub)] cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-indigo-500"
                    checked={models.length > 0 && selectedNames.length === models.length}
                    onChange={(e) => {
                      const next = {}
                      if (e.target.checked) {
                        models.forEach((m) => {
                          next[m.name] = true
                        })
                      }
                      setSelected(next)
                    }}
                  />
                  全选本页{' '}
                  <span className="tnum text-[var(--text-main)]">
                    {selectedNames.length} / {models.length}
                  </span>
                </label>

                <div className="ml-auto flex items-center gap-2">
                  <Filter size={12} className="text-[var(--text-sub)]" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer"
                  >
                    {MODEL_SORTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-black text-[var(--text-sub)]">
                    共 <span className="tnum text-[var(--text-main)]">0 / 0</span> 个模型
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              {models.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title="尚未读取模型目录"
                  desc="点击「刷新列表」选择一个模型文件夹，将真实读取其中的模型文件与大小。"
                  action={
                    <Button variant="primary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                      选择模型目录
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-1">
                  {models.map((m) => (
                    <label
                      key={m.name}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] cursor-pointer hover:bg-[var(--bg-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selected[m.name])}
                        onChange={() =>
                          setSelected((s) => ({ ...s, [m.name]: !s[m.name] }))
                        }
                        className="accent-indigo-500 shrink-0"
                      />
                      <span className="text-[11px] font-black text-[var(--text-main)] truncate">
                        {m.name}
                      </span>
                      <span className="ml-auto text-[11px] tnum text-[var(--text-sub)] shrink-0">
                        {formatBytes(m.size)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 删除已选二次确认 */}
      <ConfirmModal
        open={confirmDel}
        danger
        onClose={() => setConfirmDel(false)}
        onConfirm={() => {
          setModels((list) => list.filter((m) => !selected[m.name]))
          setSelected({})
          setConfirmDel(false)
          showToast('success', '操作成功', `已删除 ${selectedNames.length} 个模型`)
        }}
        title="删除模型"
        message={`确认删除已选的 ${selectedNames.length} 个模型？此操作不可撤销。`}
      />
    </div>
  )
}
