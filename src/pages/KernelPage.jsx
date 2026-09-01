import { useState } from 'react'
import { GitBranch, RefreshCw, Check } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Toolbar, SectionCard, EmptyState } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'

/*
 * 内核管理 —— 依据「内核管理.png」
 *
 * 结构：
 *   1. 当前远程仓库（地址 + 切换仓库 + 刷新列表 + 当前内核版本）
 *   2. 版本列表：Tab 切换 稳定版 (Releases) / 开发版 (Commits)
 *   3. 表格列：版本标识 | 更新说明 | 发布日期 | 操作
 *   4. 右上角「自动安装依赖」开关
 *
 * 数据策略：空状态优先，等待真实数据接入
 */

const TABS = [
  { id: 'releases', label: '稳定版 (Releases)' },
  { id: 'commits', label: '开发版 (Commits)' },
]

export default function KernelPage({ versions = [], currentVersion, repoUrl, autoInstall, onToggleAutoInstall }) {
  const [tab, setTab] = useState('releases')

  return (
    <div className="p-6 space-y-5">
      {/* 仓库信息 */}
      <SectionCard title="当前远程仓库">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
            <GitBranch size={14} className="text-[var(--text-sub)] shrink-0" />
            <span className="text-xs font-mono text-[var(--text-main)] truncate">
              {repoUrl || '未配置仓库地址'}
            </span>
          </div>
          <Button variant="glass" size="sm">
            切换仓库
          </Button>
          <Button variant="glass" size="sm">
            <RefreshCw size={13} />
            刷新列表
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] font-black text-[var(--text-sub)]">当前内核版本</span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-xs font-black tnum">
              {currentVersion || '—'}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* 版本列表 */}
      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)]">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`press px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  tab === t.id
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[var(--text-sub)]">自动安装依赖</span>
            <Toggle checked={autoInstall} onChange={onToggleAutoInstall} />
            <span
              className={`text-xs font-black ${
                autoInstall ? 'text-emerald-600' : 'text-[var(--text-sub)]'
              }`}
            >
              {autoInstall ? '开启' : '关闭'}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">
          {versions.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="暂无版本数据"
              desc="点击「刷新列表」从远程仓库拉取可用版本。"
            />
          ) : (
            <div className="rounded-xl border border-[var(--border-main)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-card-lighter)]">
                    {['版本标识', '更新说明', '发布日期', '操作'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-[var(--text-sub)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => {
                    const isCurrent = v.version === currentVersion
                    return (
                      <tr
                        key={v.version}
                        className="border-t border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
                      >
                        <td className="px-4 py-3 text-xs font-black tnum text-[var(--text-main)]">
                          {v.version}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-sub)] truncate max-w-[280px]">
                          {v.name}
                        </td>
                        <td className="px-4 py-3 text-xs tnum text-[var(--text-sub)]">
                          {v.date}
                        </td>
                        <td className="px-4 py-3">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-black">
                              <Check size={11} />
                              当前使用
                            </span>
                          ) : (
                            <Button variant="glass" size="sm">
                              切换
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
