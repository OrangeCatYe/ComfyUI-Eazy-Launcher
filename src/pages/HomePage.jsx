import { Rocket, FolderOpen, Clock, Blocks, Cpu, HardDrive } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { StatCard, SectionCard, EmptyState } from '../components/ui/Blocks'

/*
 * 首页 —— 依据「首页-已配置环境.png」「首次启动-无配置.png」
 *
 * 结构：
 *   1. 顶部欢迎区（标题 + 状态徽标 + 一键启动）
 *   2. 路径信息（ComfyUI 根目录 / 主 Python 路径）
 *   3. 当前设备信息（6 项数据卡）
 *   4. 快捷入口
 *
 * 数据策略：空状态优先，config 为空时展示未配置态
 */

const DEVICE_INFO = [
  { icon: Cpu, label: 'Python 版本', value: '—' },
  { icon: Cpu, label: 'Pytorch 版本', value: '—' },
  { icon: Cpu, label: 'Git 版本', value: '—' },
  { icon: HardDrive, label: 'GPU 型号', value: '—' },
  { icon: HardDrive, label: '显存占用情况', value: '—' },
  { icon: Blocks, label: '已装插件', value: '0' },
]

const QUICK_LINKS = [
  { icon: FolderOpen, label: '目录直达', desc: '快速打开常用目录' },
  { icon: FolderOpen, label: '网盘入口', desc: '各类网盘资源直达' },
  { icon: Clock, label: '定时关机', desc: '任务结束后自动关机' },
]

export default function HomePage({ config, onLaunch, running }) {
  const configured = Boolean(config?.comfyRoot)

  return (
    <div className="p-6 space-y-5">
      {/* 欢迎区 */}
      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-[0_2px_12px_var(--shadow-color)]">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[var(--text-main)] leading-tight">
              欢迎使用 ComfyUI_KK 专业管理平台
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                  configured
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {configured ? '系统就绪 环境已连接' : '未配置 请先设置根目录'}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onLaunch}
            disabled={!configured}
            className="min-w-[132px]"
          >
            <Rocket size={16} />
            {running ? '运行中' : '一键启动'}
          </Button>
        </div>

        {/* 路径信息 */}
        <div className="mt-5 pt-5 border-t border-[var(--border-main)] grid gap-4 sm:grid-cols-2">
          <PathField label="ComfyUI 根目录" value={config?.comfyRoot} />
          <PathField label="主 Python 路径" value={config?.pythonPath} />
        </div>
      </section>

      {/* 当前设备信息 */}
      <SectionCard title="当前设备信息">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DEVICE_INFO.map((it) => (
            <StatCard key={it.label} icon={it.icon} label={it.label} value={it.value} />
          ))}
        </div>
      </SectionCard>

      {/* 快捷入口 */}
      <SectionCard title="快捷入口">
        {configured ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {QUICK_LINKS.map((it) => (
              <button
                key={it.label}
                className="press group flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-lighter)] hover:border-indigo-400/50 hover:bg-[var(--bg-hover)] text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                  <it.icon size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-[var(--text-main)]">{it.label}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-sub)] truncate">{it.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="尚未配置环境"
            desc="请先在「全局设置 → 基础运行环境」中设置 ComfyUI 根目录与主 Python 路径。"
          />
        )}
      </SectionCard>
    </div>
  )
}

function PathField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-black text-[var(--text-sub)] mb-1">{label}</div>
      <div
        className="text-xs font-bold text-[var(--text-main)] truncate font-mono"
        title={value || '未配置'}
      >
        {value || '未配置'}
      </div>
    </div>
  )
}
