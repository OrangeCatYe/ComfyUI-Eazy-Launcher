import { useState } from 'react'
import { Sparkles, Copy } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Blocks'
import { useToast } from '../../components/ui/Toast'
import { POLISH_MODELS } from '../../config/tools'
import cx from '../../lib/cx'

/*
 * 提示词润色 —— 依据「提示词润色.png」
 *
 * 结构：
 *   1. 左侧选择目标模型：10 个模型卡片（名称 + 描述），选中高亮
 *   2. 原始创意/画面描述（textarea）
 *   3. 自定义规则（可选）（textarea）
 *   4. 生成专业提示词按钮
 *   5. 输出结果（简体中文）：等待生成...
 *
 * 数据策略：输出为空状态
 */

export default function PolishPage() {
  const [model, setModel] = useState(POLISH_MODELS[0].id)
  const [idea, setIdea] = useState('')
  const [rule, setRule] = useState('')
  /* 以下为补齐的交互态：输出结果与 Toast */
  const [output, setOutput] = useState('')
  const { showToast } = useToast()

  /* 生成提示词：校验必须输入灵感描述 */
  function handleGenerate() {
    if (!idea.trim()) {
      showToast('alert', '提示', '请先输入你的想法描述')
      return
    }
    const name = POLISH_MODELS.find((m) => m.id === model)?.name || model
    setOutput(
      [
        `【目标模型】${name}`,
        '',
        '【优化后提示词】',
        idea.trim(),
        '',
        rule.trim() ? `【已应用自定义规则】\n${rule.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    showToast('success', '操作成功', `已生成提示词（${name}）`)
  }

  return (
    <div className="p-6 space-y-5">
      <SectionCard title="选择目标模型">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {POLISH_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={cx(
                'press text-left p-3.5 rounded-xl border transition-all',
                model === m.id
                  ? 'border-indigo-400 bg-indigo-500/5 shadow-[0_2px_12px_var(--shadow-color)]'
                  : 'border-[var(--border-main)] bg-[var(--bg-card-lighter)] hover:border-indigo-400/50'
              )}
            >
              <div
                className={cx(
                  'text-xs font-black leading-snug',
                  model === m.id ? 'text-indigo-600' : 'text-[var(--text-main)]'
                )}
              >
                {m.name}
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-sub)] leading-relaxed">{m.desc}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 min-w-0">
          <SectionCard title="原始创意/画面描述">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="例如：一只穿着宇航服的猫在月球上跳舞，背景是地球，电影质感..."
              className="w-full px-3.5 py-3 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs text-[var(--text-main)] outline-none focus:border-indigo-400 resize-none leading-relaxed"
            />
          </SectionCard>

          <SectionCard title="自定义规则（可选）">
            <textarea
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              rows={4}
              placeholder="例如：不要出现文字，画面要偏暗黑风格，使用16:9画幅..."
              className="w-full px-3.5 py-3 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs text-[var(--text-main)] outline-none focus:border-indigo-400 resize-none leading-relaxed"
            />
          </SectionCard>

          <Button variant="primary" size="md" className="w-full" onClick={handleGenerate}>
            <Sparkles size={14} />
            生成专业提示词
          </Button>
        </div>

        <SectionCard title="输出结果（简体中文）">
          <div className="flex justify-end mb-3">
            <Button
              variant="glass"
              size="sm"
              onClick={async () => {
                if (!output) {
                  showToast('alert', '提示', '暂无可复制的结果')
                  return
                }
                try {
                  await navigator.clipboard.writeText(output)
                  showToast('success', '操作成功', '提示词已复制到剪贴板')
                } catch {
                  showToast('alert', '提示', '复制失败，请手动选择文本复制')
                }
              }}
            >
              <Copy size={13} />
              复制
            </Button>
          </div>
          <div className="min-h-[320px] rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] p-4 text-xs text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
            {output || '等待生成...'}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
