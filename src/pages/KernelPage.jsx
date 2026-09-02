import { useEffect, useState } from 'react'
import { GitBranch, RefreshCw, Check } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Toolbar, SectionCard, EmptyState } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { TextInput } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { call } from '../lib/backend'

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

export default function KernelPage({ versions = [], commits = [], currentVersion, repoUrl, comfyRoot, autoInstall, onToggleAutoInstall, onAction }) {
  const [tab, setTab] = useState('releases')
  /* 切换仓库弹窗 / 切换版本二次确认 / 刷新中状态 */
  const [repoOpen, setRepoOpen] = useState(false)
  const [switchTarget, setSwitchTarget] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()

  const fire = (action, payload) => onAction?.(action, payload)

  /* 刷新列表：由后端真实执行 git fetch --tags，结果见终端输出 */
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const r = await call('kernel_list_versions', [comfyRoot], '拉取版本列表需要后端执行 git 操作')
      showToast('success', '刷新完成', `已真实拉取 ${(r.versions || []).length} 个版本标签，详见终端输出。`)
      fire('kernel-refresh')
    } catch (e) {
      showToast('alert', '刷新失败', e?.message || '拉取版本列表失败。')
    } finally {
      setRefreshing(false)
    }
  }

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
          <Button variant="glass" size="sm" onClick={() => setRepoOpen(true)}>
            切换仓库
          </Button>
          <Button variant="glass" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? '拉取中...' : '刷新列表'}
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
          {/* 稳定版=Releases 标签，开发版=主分支提交；两份数据独立保存 */}
          {(tab === 'releases' ? versions : commits).length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title={tab === 'releases' ? '暂无版本数据' : '暂无开发版数据'}
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
                  {(tab === 'releases' ? versions : commits).map((v) => {
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
                            <Button variant="glass" size="sm" onClick={() => setSwitchTarget(v)}>
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

      {/* 切换仓库 */}
      <RepoModal
        open={repoOpen}
        current={repoUrl}
        onClose={() => setRepoOpen(false)}
        onConfirm={async (url) => {
          setRepoOpen(false)
          try {
            const r = await call('kernel_set_remote', [comfyRoot, url], '切换仓库需要后端执行 git 操作')
            showToast('success', '切换完成', `已真实切换到 ${r.url || url}`)
            fire('kernel-switch-repo', url)
          } catch (e) {
            showToast('alert', '切换失败', e?.message || '切换仓库失败。')
          }
        }}
      />

      {/* 切换版本二次确认（§6.2：简单取消/确认两按钮） */}
      <ConfirmModal
        open={Boolean(switchTarget)}
        onClose={() => setSwitchTarget(null)}
        onConfirm={async () => {
          const ver = switchTarget?.version
          setSwitchTarget(null)
          try {
            await call('kernel_checkout', [comfyRoot, ver], '切换版本需要后端执行 git 与依赖重建')
            showToast('success', '切换完成', `已真实切换到版本 ${ver}`)
            fire('kernel-switch-version', ver)
          } catch (e) {
            showToast('alert', '切换失败', e?.message || '切换版本失败。')
          }
        }}
        title="切换内核版本"
        message={`确认将内核切换到「${switchTarget?.version || ''}」？切换过程会拉取对应版本并重建依赖。`}
      />
    </div>
  )
}

/* 切换仓库弹窗 */
function RepoModal({ open, current, onClose, onConfirm }) {
  const [url, setUrl] = useState('')
  /* 打开时预填当前地址（含自动识别的 origin），用户可改可不动 */
  useEffect(() => {
    if (open) setUrl(current || '')
  }, [open, current])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="切换远程仓库"
      description="已自动填入当前仓库地址（来自本地仓库 origin），可修改后切换。"
      size="md"
      footer={
        <>
          <Button variant="glass" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!url.trim()}
            onClick={() => onConfirm(url.trim())}
          >
            确认切换
          </Button>
        </>
      }
    >
      <div className="pb-2">
        <div className="text-[11px] font-black text-[var(--text-sub)] mb-1.5">仓库地址</div>
        <TextInput
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/Comfy-Org/ComfyUI.git"
        />
      </div>
    </Modal>
  )
}
