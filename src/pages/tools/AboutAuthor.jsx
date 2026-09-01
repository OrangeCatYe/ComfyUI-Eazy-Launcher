import { useState } from 'react'
import { User, Download, ExternalLink, Package } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Blocks'
import { AUTHOR_PLUGINS, AUTHOR_TABS } from '../../config/tools'
import cx from '../../lib/cx'

/*
 * 关于作者 —— 依据「关于作者.png」
 *
 * 结构：
 *   1. 五 Tab：推荐插件 / 推荐工具 / 资源网站 / 软件声明 / 作者信息
 *   2. 推荐插件卡片：插件名 (中文说明) + 仓库地址 + 快捷安装按钮
 *   3. 底部：更多推荐内容将持续添加...
 *
 * 数据策略：插件数据为静态（截图实证的真实仓库地址），其余 Tab 为空态
 */

export default function AboutAuthorPage() {
  const [tab, setTab] = useState(AUTHOR_TABS[0])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] w-fit flex-wrap">
        {AUTHOR_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'press px-4 py-2 rounded-lg text-xs font-black transition-all',
              tab === t
                ? 'bg-indigo-500 text-white shadow'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '推荐插件' ? (
        <SectionCard>
          <div className="space-y-2.5">
            {AUTHOR_PLUGINS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] hover:border-indigo-400/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center shrink-0">
                  <Package size={15} className="text-[var(--text-sub)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-[var(--text-main)] truncate">
                    {p.name} <span className="text-[var(--text-sub)]">({p.label})</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono text-[var(--text-sub)] truncate">
                    {p.url}
                  </div>
                </div>

                <Button variant="glass" size="sm">
                  <ExternalLink size={12} />
                  访问
                </Button>
                <Button variant="primary" size="sm">
                  <Download size={12} />
                  快捷安装
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-main)] text-center text-[11px] text-[var(--text-sub)]">
            更多推荐内容将持续添加...
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] flex items-center justify-center mb-3">
              <User size={22} className="text-[var(--text-sub)]" />
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">{tab}</div>
            <div className="mt-1 text-xs text-[var(--text-sub)] max-w-xs leading-relaxed">
              该板块暂无内容，更多推荐内容将持续添加...
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
