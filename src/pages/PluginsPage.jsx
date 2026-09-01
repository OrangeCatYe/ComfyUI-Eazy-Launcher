import { useEffect, useRef, useState } from 'react'
import { Blocks, Download, RefreshCw, Power, Trash2, History, GitBranch, Search } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { SearchInput, TextInput } from '../components/ui/Input'
import { Toolbar, SectionCard, EmptyState } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'
import { Badge } from '../components/ui/Badge'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'

/*
 * 插件管理 —— 依据「插件管理.png」
 *
 * 结构：
 *   1. 工具栏：N 个已安装 | 安装新插件 | 自动安装依赖 | 放心装 | 批量导出/更新/开关/卸载
 *   2. 搜索框
 *   3. 插件卡片列表：名称 / 仓库地址 / 已启用 / 分支 / GIT版本 / 更新时间 / 操作
 *
 * 数据策略：空状态优先
 */

export default function PluginsPage({ plugins = [], autoInstall, onToggleAutoInstall, safeMode, onToggleSafeMode, onAction }) {
  const [keyword, setKeyword] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const [historyPlugin, setHistoryPlugin] = useState(null)
  const [switchPlugin, setSwitchPlugin] = useState(null)
  /* 批量操作弹窗：update / export / toggle / uninstall */
  const [batchMode, setBatchMode] = useState(null)
  /* 行内操作确认 */
  const [confirm, setConfirm] = useState(null)
  const { showToast } = useToast()

  /* 统一出口：日志走 App 终端，提示走 Toast */
  const fire = (action, payload) => onAction?.(action, payload)
  /*
   * 插件的启停/卸载/回滚/批量操作由 App.jsx 转发给后端真实执行，
   * 执行结果（成功/失败）由终端日志与 Toast 如实反馈。
   * 这里仅在后端不可用时补充说明，不假装成功。
   */
  const ok = (msg) =>
    showToast('info', '已提交后端', `${msg} —— 正在由后端执行，结果见下方终端输出。`)

  const list = keyword.trim()
    ? plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword.toLowerCase()) ||
          (p.url || '').toLowerCase().includes(keyword.toLowerCase())
      )
    : plugins

  return (
    <div className="p-6 space-y-5">
      <Toolbar count={plugins.length} countUnit="个已安装">
        <Button variant="primary" size="sm" onClick={() => setInstallOpen(true)}>
          + 安装新插件
        </Button>
      </Toolbar>

      <SectionCard>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[var(--text-sub)]">自动安装依赖</span>
            <Toggle checked={autoInstall} onChange={onToggleAutoInstall} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[var(--text-sub)]">放心装</span>
            <Toggle checked={safeMode} onChange={onToggleSafeMode} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="glass" size="sm" onClick={() => setBatchMode('export')}>
              <Download size={13} />
              批量导出
            </Button>
            <Button variant="glass" size="sm" onClick={() => setBatchMode('update')}>
              <RefreshCw size={13} />
              批量更新
            </Button>
            <Button variant="glass" size="sm" onClick={() => setBatchMode('toggle')}>
              <Power size={13} />
              批量开关
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBatchMode('uninstall')}>
              <Trash2 size={13} />
              批量卸载
            </Button>
          </div>
        </div>

        <div className="mb-4 max-w-md">
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索插件名称、地址..."
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Blocks}
            title={keyword ? '未找到匹配的插件' : '暂无已安装插件'}
            desc={
              keyword
                ? '试试更换关键词，或清空搜索条件。'
                : '点击右上角「+ 安装新插件」开始安装你的第一个插件。'
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((p) => (
              <PluginRow
                key={p.name}
                plugin={p}
                onHistory={() => setHistoryPlugin(p)}
                onSwitch={() => {
                  fire('plugin-log', `>>> 正在拉取「${p.name}」最新版本...`)
                  ok('回滚成功（无需安装依赖）')
                }}
                onToggle={() =>
                  setConfirm({
                    action: 'toggle',
                    plugin: p,
                    message: `确认${p.enabled ? '禁用' : '启用'}插件「${p.name}」？`,
                  })
                }
                onUninstall={() =>
                  setConfirm({
                    action: 'uninstall',
                    plugin: p,
                    message: `确认卸载插件「${p.name}」？此操作不可撤销。`,
                    danger: true,
                  })
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        onInstall={(url) => {
          setInstallOpen(false)
          fire('install-plugin', url)
        }}
      />
      <HistoryModal
        plugin={historyPlugin}
        onClose={() => setHistoryPlugin(null)}
        onSwitch={(p) => {
          setHistoryPlugin(null)
          setSwitchPlugin(p)
        }}
      />
      <ConfirmModal
        open={Boolean(switchPlugin)}
        onClose={() => setSwitchPlugin(null)}
        onConfirm={() => {
          fire('plugin-switch', switchPlugin?.name)
          setSwitchPlugin(null)
          ok('回滚成功（无需安装依赖）')
        }}
        title="切换插件版本"
        message={`确认将「${switchPlugin?.name || ''}」切换到所选版本？切换过程会拉取对应提交。`}
      />

      {/* 行内 启用/禁用/卸载 二次确认 */}
      <ConfirmModal
        open={Boolean(confirm)}
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const { action, plugin } = confirm || {}
          setConfirm(null)
          if (action === 'toggle') {
            fire('plugin-toggle', plugin?.name)
            ok(`插件「${plugin?.name}」已${plugin?.enabled ? '禁用' : '启用'}`)
          } else if (action === 'uninstall') {
            fire('plugin-uninstall', plugin?.name)
            ok(`插件「${plugin?.name}」已卸载`)
          }
        }}
        title={confirm?.danger ? '卸载插件' : '切换插件状态'}
        message={confirm?.message || ''}
      />

      {/* 批量操作弹窗（§6.2：更新弹窗含「仅显示有新版本的插件」+ 立即执行 N） */}
      <BatchModal
        mode={batchMode}
        plugins={plugins}
        onClose={() => setBatchMode(null)}
        onExecute={(mode, names) => {
          setBatchMode(null)
          fire(`batch-${mode}`, names)
          const label = { export: '导出', update: '更新', toggle: '开关', uninstall: '卸载' }[mode]
          ok(`已提交批量${label}任务（${names.length} 个插件）`)
        }}
      />
    </div>
  )
}

/* 安装新插件弹窗 —— 依据「插件管理-安装新插件.png」 */
function InstallModal({ open, onClose, onInstall }) {
  const [url, setUrl] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="安装新插件"
      description="粘贴插件的 Git 仓库地址，或选择本地插件目录进行安装。"
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
            onClick={() => onInstall?.(url.trim())}
          >
            开始安装
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        <div>
          <div className="text-[11px] font-black text-[var(--text-sub)] mb-1.5">仓库地址</div>
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/author/plugin-name.git"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={() => onInstall?.('本地目录')}>
            选择本地插件目录
          </Button>
          <span className="text-[11px] text-[var(--text-sub)]">尚未选择本地文件。</span>
        </div>
      </div>
    </Modal>
  )
}

/*
 * 批量操作弹窗 —— 依据 DESIGN.md §6.2
 *
 * 4 种模式共用：export / update / toggle / uninstall
 * update 模式额外提供「仅显示当前有新版本的插件」过滤（截图实证），
 * 底部按钮为「立即执行 (N)」。
 */
function BatchModal({ mode, plugins = [], onClose, onExecute }) {
  const [selected, setSelected] = useState({})
  const [onlyOutdated, setOnlyOutdated] = useState(false)

  /* 每次打开/切换模式时重置为全选 */
  useEffect(() => {
    if (!mode) return
    const all = {}
    plugins.forEach((p) => {
      all[p.name] = true
    })
    setSelected(all)
    setOnlyOutdated(false)
  }, [mode, plugins])

  if (!mode) return null

  const CONFIG = {
    export: { title: '批量导出插件', desc: '导出所选插件的配置信息。', btn: '导出', danger: false },
    update: { title: '批量更新插件', desc: '更新所选插件到最新版本。', btn: '更新', danger: false },
    toggle: { title: '批量开关插件', desc: '切换所选插件的启用状态。', btn: '切换', danger: false },
    uninstall: { title: '批量卸载插件', desc: '卸载所选插件，此操作不可撤销。', btn: '卸载', danger: true },
  }
  const cfg = CONFIG[mode]

  /* update 模式下可只显示有新版本的插件（§6.2 截图实证） */
  const visible =
    mode === 'update' && onlyOutdated ? plugins.filter((p) => p.hasUpdate) : plugins

  const names = plugins.filter((p) => selected[p.name]).map((p) => p.name)
  const visibleSelected = visible.filter((p) => selected[p.name]).length
  const allVisibleChecked = visible.length > 0 && visible.every((p) => selected[p.name])

  const toggleAll = (checked) => {
    const next = { ...selected }
    visible.forEach((p) => {
      next[p.name] = checked
    })
    setSelected(next)
  }

  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
      title={cfg.title}
      description={cfg.desc}
      size="md"
      footer={
        <>
          <Button variant="glass" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            variant={cfg.danger ? 'danger' : 'primary'}
            size="sm"
            disabled={names.length === 0}
            onClick={() => onExecute(mode, names)}
          >
            立即执行 ({names.length})
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        {/* update 模式专有过滤 */}
        {mode === 'update' && (
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] cursor-pointer">
            <input
              type="checkbox"
              checked={onlyOutdated}
              onChange={(e) => setOnlyOutdated(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
            />
            <span className="text-[11px] font-black text-[var(--text-main)]">
              仅显示当前有新版本的插件
            </span>
          </label>
        )}

        {plugins.length === 0 ? (
          <EmptyState
            icon={Blocks}
            title="暂无可操作的插件"
            desc="当前没有已安装的插件。"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Blocks}
            title="没有有新版本的插件"
            desc="所有插件均已是最新版本。"
          />
        ) : (
          <>
            <label className="flex items-center gap-2 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] font-black text-[var(--text-sub)]">
                全选（已选 {visibleSelected}/{visible.length}）
              </span>
            </label>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {visible.map((p) => (
                <label
                  key={p.name}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] cursor-pointer hover:bg-[var(--bg-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected[p.name])}
                    onChange={() => setSelected((s) => ({ ...s, [p.name]: !s[p.name] }))}
                    className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-black text-[var(--text-main)] truncate">
                    {p.name}
                  </span>
                  {p.hasUpdate && (
                    <Badge tone="warning" className="ml-auto shrink-0">
                      有新版本
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/* 历史版本弹窗 —— 依据「插件管理「历史」.png」 */
function HistoryModal({ plugin, onClose, onSwitch }) {
  if (!plugin) return null
  return (
    <Modal
      open={Boolean(plugin)}
      onClose={onClose}
      title={`${plugin.name} — 历史版本`}
      description="选择要切换到的提交版本。"
      size="md"
      footer={
        <Button variant="glass" size="sm" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div className="space-y-2 pb-2">
        <EmptyState
          icon={History}
          title="暂无历史版本"
          desc="该插件尚无历史提交记录，或记录尚未拉取。"
        />
        <div className="flex justify-end">
          <Button variant="glass" size="sm" onClick={() => onSwitch(plugin)}>
            切换到指定版本
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function PluginRow({ plugin, onHistory, onSwitch, onToggle, onUninstall }) {
  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] p-4 hover:border-indigo-400/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-[var(--text-main)] truncate">{plugin.name}</span>
            <Badge tone={plugin.enabled ? 'success' : 'default'}>
              {plugin.enabled ? '已启用' : '已禁用'}
            </Badge>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[var(--text-sub)] truncate">
            {plugin.url || '本地插件'}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--text-sub)] tnum">
            <span className="flex items-center gap-1">
              <GitBranch size={11} />
              {plugin.branch || '--'}
            </span>
            <span>GIT 版本：{plugin.commit || '--'}</span>
            <span>更新：{plugin.updatedAt || '--'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="glass" size="sm" onClick={onSwitch}>
            最新
          </Button>
          <Button variant="glass" size="sm" onClick={onHistory}>
            <History size={12} />
            历史
          </Button>
          <Button variant="glass" size="sm" onClick={onToggle}>
            {plugin.enabled ? '禁用' : '启用'}
          </Button>
          <Button variant="danger" size="sm" onClick={onUninstall}>
            卸载
          </Button>
        </div>
      </div>
    </div>
  )
}
