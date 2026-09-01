import { useState } from 'react'
import { ScanEye, Upload, Copy, Sparkles, Settings2, Image as ImageIcon } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Blocks'
import cx from '../../lib/cx'

/*
 * 识图反推提示词 —— 依据「识图反推提示词.png」
 *
 * 结构（左右分栏）：
 *   左：反推模板（可选）+ 管理模型 + 拖拽上传区 + 上传图片/开始反推
 *   右：生成结果（复制按钮）
 *   底：当前模型：未选择 | 模板：预设 | 消耗用时：0.00秒
 *
 * 数据策略：空状态优先
 */

export default function ImagePromptRevPage() {
  const [dragging, setDragging] = useState(false)
  const [template, setTemplate] = useState('preset')

  return (
    <div className="p-6 space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 左：上传区 */}
        <div className="space-y-4 min-w-0">
          <SectionCard>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[var(--text-sub)]">反推模板（可选）</span>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-main)] outline-none cursor-pointer"
              >
                <option value="preset">预设</option>
                <option value="custom">自定义</option>
              </select>
              <Button variant="glass" size="sm" className="ml-auto">
                <Settings2 size={13} />
                管理模型
              </Button>
            </div>
          </SectionCard>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
            }}
            className={cx(
              'rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-colors',
              dragging
                ? 'border-indigo-400 bg-indigo-500/5'
                : 'border-[var(--border-main)] bg-[var(--bg-card)]'
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] flex items-center justify-center mb-3">
              <ImageIcon size={22} className="text-[var(--text-sub)]" />
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">拖入图片到这里</div>
            <div className="mt-1 text-xs text-[var(--text-sub)]">或单击此处从本地上传图片</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="glass" size="md">
              <Upload size={14} />
              上传图片
            </Button>
            <Button variant="primary" size="md">
              <Sparkles size={14} />
              开始反推
            </Button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[var(--text-sub)] flex-wrap">
            <span>
              当前模型：<span className="font-black text-[var(--text-main)]">未选择</span>
            </span>
            <span>
              模板：<span className="font-black text-[var(--text-main)]">预设</span>
            </span>
            <span>
              消耗用时：<span className="font-black tnum text-[var(--text-main)]">0.00秒</span>
            </span>
          </div>
        </div>

        {/* 右：生成结果 */}
        <SectionCard title="生成结果">
          <div className="flex justify-end mb-3">
            <Button variant="glass" size="sm">
              <Copy size={13} />
              复制
            </Button>
          </div>
          <div className="min-h-[280px] rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] p-4 text-xs text-[var(--text-sub)] leading-relaxed">
            请先上传图片，然后点击「开始反推」。
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
