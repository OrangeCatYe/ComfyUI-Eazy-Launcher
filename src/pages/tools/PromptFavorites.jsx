import { useState } from 'react'
import { Bookmark, Plus, FolderPlus, Search, Lightbulb } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { Modal } from '../../components/ui/Modal'
import { PROMPT_CATEGORIES } from '../../config/tools'
import cx from '../../lib/cx'

/*
 * 提示词收藏夹 —— 依据「提示词收藏夹1/2.png」「提示词收藏夹-新建*.png」
 *
 * 结构：
 *   1. 标题区：本地保存徽标 + 添加提示词
 *   2. 统计：提示词 N | 分类 N
 *   3. 搜索标题、内容或标签
 *   4. 分类列表：闪念胶囊（1条提示词·1项）/ 创作提示词 / 人物设定模板
 *      每类含子项：随手记录、提示词资产
 *   5. 新建收藏夹弹窗（截图实证）
 *
 * 数据策略：分类为静态默认，提示词列表为空
 */

export default function PromptFavoritesPage() {
  const [keyword, setKeyword] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-[var(--text-main)]">提示词收藏夹</h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-black">
              本地保存
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-sub)]">
            收藏、归纳、复用你的提示词资产，支持多级分类。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus size={13} />
            新建分类
          </Button>
          <Button variant="primary" size="sm">
            <Plus size={13} />
            添加提示词
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Stat label="提示词" value={0} />
        <Stat label="分类" value={PROMPT_CATEGORIES.length} />
      </div>

      <div className="max-w-md">
        <SearchInput value={keyword} onChange={setKeyword} placeholder="搜索标题、内容或标签" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 分类列表 */}
        <div className="space-y-3 min-w-0">
          {PROMPT_CATEGORIES.map((c) => (
            <SectionCard key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-[var(--text-main)]">{c.name}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-sub)]">
                    <span className="tnum">{c.id === 'capsule' ? 1 : 0}</span> 条提示词 ·{' '}
                    <span className="tnum">{c.id === 'capsule' ? 1 : 0}</span> 项
                  </div>
                </div>
                <Button variant="glass" size="sm">
                  <Plus size={12} />
                  添加
                </Button>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--border-main)]">
                <EmptyState
                  icon={Bookmark}
                  title={c.id === 'capsule' ? '随手记录' : '暂无提示词'}
                  desc={c.desc}
                />
              </div>
            </SectionCard>
          ))}
        </div>

        {/* 闪念胶囊侧栏 */}
        <SectionCard title="闪念胶囊" desc="1条提示词，0个子分类">
          <div className="space-y-3">
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              {PROMPT_CATEGORIES[0].desc}
            </p>
            <Button variant="glass" size="sm" className="w-full">
              <Lightbulb size={13} />
              闪念
            </Button>
          </div>
        </SectionCard>
      </div>

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="新建收藏夹"
        description="创建一个新的提示词分类，便于归纳你的提示词资产。"
        size="sm"
        footer={
          <>
            <Button variant="glass" size="sm" onClick={() => setNewFolderOpen(false)}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewFolderOpen(false)}>
              创建
            </Button>
          </>
        }
      >
        <div className="space-y-3 pb-2">
          <div>
            <div className="text-[11px] font-black text-[var(--text-sub)] mb-1.5">分类名称</div>
            <input
              placeholder="例如：赛博朋克风格"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs text-[var(--text-main)] outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <div className="text-[11px] font-black text-[var(--text-sub)] mb-1.5">上级分类（可选）</div>
            <select className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs text-[var(--text-main)] outline-none cursor-pointer">
              <option value="">（无，作为顶级分类）</option>
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--text-sub)]">{label}</div>
      <div className="text-xl font-black tnum text-[var(--text-main)] leading-tight">{value}</div>
    </div>
  )
}
