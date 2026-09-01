import cx from '../lib/cx'

/*
 * 实用工具 —— 依据「实用工具.png」
 *
 * 结构：卡片网格，每张卡含 图标 / 标题 / 描述 / 「点击开始使用」
 * 排序：支持长按拖拽（localStorage key = kk_tools_hub_order）
 *
 * 数据策略：卡片为静态注册表，无空状态
 */

export default function ToolsPage({ tools, onOpen }) {
  return (
    <div className="p-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function ToolCard({ tool, onOpen }) {
  return (
    <div
      data-tool-card-id={tool.id}
      onClick={() => onOpen(tool)}
      className="press group relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 cursor-pointer hover:border-indigo-400/50 hover:shadow-[0_8px_32px_var(--shadow-color)]"
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cx(
            'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg',
            tool.gradient
          )}
        >
          <tool.icon size={22} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-[var(--text-main)] leading-snug">{tool.label}</h3>
          <p className="mt-1.5 text-xs text-[var(--text-sub)] leading-relaxed">{tool.desc}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
        点击开始使用
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>

      {tool.kind === 'action' && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[10px] font-black text-[var(--text-sub)]">
          外链
        </span>
      )}
    </div>
  )
}
