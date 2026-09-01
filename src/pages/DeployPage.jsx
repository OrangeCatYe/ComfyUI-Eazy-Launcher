import { Rocket, FolderOpen, RotateCcw, Check, Download } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { SectionCard, FieldRow, EmptyState } from '../components/ui/Blocks'

/*
 * 初恋部署 —— 依据「初恋部署.png」
 *
 * 结构：
 *   1. Hero 区：标题 / 描述 / 从零开始 · 重置环境
 *   2. 驱动状态
 *   3. 支持版本（Python / Pytorch+Cuda）
 *   4. 部署配置（4 个源地址）
 *   5. 部署目录 + 开始部署
 *   6. 部署进度
 *
 * 数据策略：空状态优先
 */

const DEPLOY_SOURCES = [
  { label: 'ComfyUI 仓库', value: 'https://github.com/Comfy-Org/ComfyUI.git' },
  { label: 'Pytorch 套件下载站', value: 'https://mirrors.aliyun.com/pytorch-wheels' },
  { label: 'Python 下载站', value: 'https://www.python.org/downloads/' },
  { label: 'PYPI 源', value: 'https://pypi.tuna.tsinghua.edu.cn/simple' },
]

export default function DeployPage({ driver, versions, dir, progress, status, onPickDir, onDeploy }) {
  return (
    <div className="p-6 space-y-5">
      {/* Hero */}
      <section className="rounded-2xl border border-[var(--border-main)] bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent p-6">
        <h2 className="text-xl font-black text-[var(--text-main)] leading-tight">
          人生若只如初见，一键纯净遂心愿。
        </h2>
        <p className="mt-2 text-xs text-[var(--text-sub)] leading-relaxed max-w-2xl">
          自定义构建虚拟环境版本，一键部署新的 ComfyUI 整合包到本地电脑中。该功能目前仅适用于 NVIDIA
          显卡用户。
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="primary" size="sm">
            <Rocket size={13} />
            从零开始
          </Button>
          <Button variant="glass" size="sm">
            <RotateCcw size={13} />
            重置环境
          </Button>
        </div>
      </section>

      {/* 驱动状态 */}
      <SectionCard title="驱动状态">
        {driver ? (
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-black">
                <Check size={11} />
                已安装
              </span>
              <span className="text-xs font-bold text-[var(--text-main)] tnum">
                驱动版本：{driver.version}
              </span>
            </div>
            <div className="text-xs text-[var(--text-sub)]">GPU：{driver.gpu}</div>
            <div className="text-xs text-[var(--text-sub)]">架构推断：{driver.arch}</div>
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="未检测到驱动信息"
            desc="该功能仅适用于 NVIDIA 显卡用户，请确认驱动已正确安装。"
          />
        )}
      </SectionCard>

      {/* 支持版本 */}
      <SectionCard title="支持版本">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Python 版本">
            <span className="text-xs font-black tnum text-[var(--text-main)]">
              {versions?.python || '—'}
            </span>
          </FieldRow>
          <FieldRow label="Pytorch+Cuda 套件">
            <span className="text-xs font-black tnum text-[var(--text-main)]">
              {versions?.torch || '—'}
            </span>
          </FieldRow>
        </div>
      </SectionCard>

      {/* 部署配置 */}
      <SectionCard title="部署配置">
        <div className="space-y-3">
          {DEPLOY_SOURCES.map((s) => (
            <FieldRow key={s.label} label={s.label}>
              <div className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)]">
                <span className="text-[11px] font-mono text-[var(--text-main)] truncate block">
                  {s.value}
                </span>
              </div>
            </FieldRow>
          ))}

          <FieldRow label="部署目录">
            <button
              onClick={onPickDir}
              className="press flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-lighter)] hover:border-indigo-400/60 text-left"
            >
              <FolderOpen size={14} className="text-[var(--text-sub)] shrink-0" />
              <span className="text-xs text-[var(--text-sub)] truncate">
                {dir || '点击选择部署目录'}
              </span>
            </button>
          </FieldRow>
        </div>

        <div className="mt-5">
          <Button variant="primary" size="lg" className="w-full" onClick={onDeploy}>
            <Download size={16} />
            开始部署
          </Button>
        </div>
      </SectionCard>

      {/* 部署进度 */}
      <SectionCard title="部署进度">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 rounded-full bg-[var(--bg-card-lighter)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
          <span className="text-sm font-black tnum text-[var(--text-main)] w-14 text-right">
            {(progress || 0).toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[10px] font-black text-[var(--text-sub)]">
            {status || '待命'}
          </span>
          <span className="text-[11px] text-[var(--text-sub)]">等待部署任务开始...</span>
        </div>
      </SectionCard>
    </div>
  )
}
