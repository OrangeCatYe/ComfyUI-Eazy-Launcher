import { useState } from 'react'
import { Blocks, Download, RefreshCw, Power, Trash2, History, GitBranch, Search } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { SearchInput, TextInput } from '../components/ui/Input'
import { Toolbar, SectionCard, EmptyState } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'
import { Badge } from '../components/ui/Badge'
import { Modal, ConfirmModal } from '../components/ui/Modal'

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

export default function PluginsPage({ plugins = [], autoInstall, onToggleAutoInstall, safeMode, onToggleSafeMode }) {
  const [keyword, setKeyword] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const [historyPlugin, setHistoryPlugin] = useState(null)
  const [switchPlugin, setSwitchPlugin] = useState(null)

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
            <Button variant="glass" size="sm">
              <Download size={13} />
              批量导出
            </Button>
            <Button variant="glass" size="sm">
              <RefreshCw size={13} />
              批量更新
            </Button>
            <Button variant="glass" size="sm">
              <Power size={13} />
              批量开关
            </Button>
            <Button variant="danger" size="sm">
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
                onSwitch={() => setSwitchPlugin(p)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
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
        onConfirm={() => setSwitchPlugin(null)}
        title="切换插件版本"
        message={`确认将「${switchPlugin?.name || ''}」切换到所选版本？切换过程会拉取对应提交。`}
      />
    </div>
  )
}

/* 安装新插件弹窗 —— 依据「插件管理-安装新插件.png」 */
function InstallModal({ open, onClose }) {
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
          <Button variant="primary" size="sm" onClick={onClose}>
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
          <Button variant="glass" size="sm">
            选择本地插件目录
          </Button>
          <span className="text-[11px] text-[var(--text-sub)]">尚未选择本地文件。</span>
        </div>
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

function PluginRow({ plugin, onHistory, onSwitch }) {
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
          <Button variant="glass" size="sm">
            最新
          </Button>
          <Button variant="glass" size="sm" onClick={onHistory}>
            <History size={12} />
            历史
          </Button>
          <Button variant="glass" size="sm">
            {plugin.enabled ? '禁用' : '启用'}
          </Button>
          <Button variant="danger" size="sm">
            卸载
          </Button>
        </div>
      </div>
    </div>
  )
}
