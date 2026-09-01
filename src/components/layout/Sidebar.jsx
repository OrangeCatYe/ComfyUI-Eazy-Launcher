import {
  Blocks,
  Bookmark,
  Boxes,
  Copy,
  Cpu,
  Film,
  Image as ImageIcon,
  LayoutDashboard,
  PackageSearch,
  Power,
  Rocket,
  ScanEye,
  Settings,
  Sparkles,
  User,
  Workflow,
  Wrench,
} from 'lucide-react'
import cx from '../../lib/cx'

/*
 * 图标名 → 组件映射
 * 原版依赖 lucide-react，此处按名取用（P2 视觉细节待用户校准）
 */
export const ICONS = {
  LayoutDashboard,
  Cpu,
  Blocks,
  PackageSearch,
  Wrench,
  Rocket,
  Settings,
  Boxes,
  Copy,
  ScanEye,
  Workflow,
  Bookmark,
  Sparkles,
  Film,
  Power,
  Image: ImageIcon,
  User,
}

export function Icon({ name, ...rest }) {
  const C = ICONS[name]
  if (!C) return null
  return <C {...rest} />
}

/*
 * Sidebar —— 原版左侧导航
 * 观感：顶部 Logo 区（ComfyUI_KK 专业启动器）+ 版本，下方 7 项纵向菜单
 * 选中态：渐变高亮 + 左侧指示条
 */
export function Sidebar({ current, onNavigate }) {
  const items = [
    { id: 'home', label: '首页', icon: LayoutDashboard },
    { id: 'kernel', label: '内核管理', icon: Cpu },
    { id: 'plugins', label: '插件管理', icon: Blocks },
    { id: 'deps', label: '环境依赖', icon: PackageSearch },
    { id: 'tools', label: '实用工具', icon: Wrench },
    { id: 'deploy', label: '初恋部署', icon: Rocket },
    { id: 'settings', label: '全局设置', icon: Settings },
  ]

  return (
    <aside className="w-[220px] shrink-0 h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white font-black text-xs">KK</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-[var(--text-main)] truncate">ComfyUI_KK</div>
            <div className="text-[10px] font-bold text-[var(--text-sub)] truncate">专业启动器</div>
          </div>
        </div>
        <div className="mt-3 inline-block px-2 py-0.5 rounded-md bg-[var(--bg-hover)] text-[10px] font-black text-[var(--text-sub)] tnum">
          v2.0.7
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((it) => {
          const active = current === it.id || (it.id === 'tools' && current.startsWith('tool:'))
          return (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              className={cx(
                'press w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
              )}
            >
              <it.icon size={15} />
              <span className="truncate">{it.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border-main)]">
        <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-hover)]">
          <div className="text-[10px] font-black text-[var(--text-sub)]">本地数据模式</div>
          <div className="mt-0.5 text-[10px] text-[var(--text-sub)] opacity-70">
            数据接入后将自动填充
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
