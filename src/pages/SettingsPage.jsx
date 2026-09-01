import { useState } from 'react'
import { FolderOpen, FileText, RotateCcw, Save } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { SectionCard, FieldRow } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'

/*
 * 全局设置 —— 依据「全局设置-性能优化-1.png」「全局设置-软件设置-1 (1).png」
 *
 * 双 Tab：性能优化 / 软件设置
 *
 * 性能优化：硬件调度与计算策略（5 个下拉 + 精度设置）
 * 软件设置：系统与网络配置（路径 + 端口 + 局域网 + 代理）
 *
 * 数据策略：空状态优先，所有输入项等待真实配置接入
 */

const TABS = [
  { id: 'performance', label: '性能优化' },
  { id: 'software', label: '软件设置' },
]

const PERF_FIELDS = [
  {
    key: 'engine',
    label: '计算引擎选择',
    hint: '为获得最佳效果，建议选择 NVIDIA 显卡作为计算引擎',
    value: '—',
  },
  {
    key: 'vram',
    label: '显存优化策略',
    hint: '根据显存容量选择 CPU/GPU 分配策略',
    value: '自动（由 ComfyUI 决定）',
  },
  {
    key: 'cuda',
    label: 'CUDA 分配策略',
    hint: '遇到显存碎片化或 OOM 错误可尝试切换',
    value: '自动（由 ComfyUI 决定）',
  },
  {
    key: 'attn',
    label: '注意力计算方案（Cross-Attention）',
    hint: '交叉注意力优化方案，有效降低显存用量',
    value: '自动（由 ComfyUI 决定）',
  },
  {
    key: 'preview',
    label: '预览图生成模式',
    hint: '选择生成过程中预览图的生成方式',
    value: '自动（由 ComfyUI 决定）',
  },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('performance')
  const [lanEnabled, setLanEnabled] = useState(false)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`press px-5 py-2 rounded-lg text-xs font-black transition-all ${
              tab === t.id
                ? 'bg-indigo-500 text-white shadow'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'performance' ? (
        <PerformanceTab />
      ) : (
        <SoftwareTab lanEnabled={lanEnabled} onToggleLan={setLanEnabled} />
      )}
    </div>
  )
}

function PerformanceTab() {
  return (
    <SectionCard title="硬件调度与计算策略">
      <div className="space-y-4">
        {PERF_FIELDS.map((f) => (
          <FieldRow key={f.key} label={f.label} hint={f.hint} labelWidth="w-52">
            <select className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-indigo-400">
              <option>{f.value}</option>
            </select>
          </FieldRow>
        ))}

        <div className="pt-4 mt-2 border-t border-[var(--border-main)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-[var(--text-main)]">计算精度深度设置</h4>
            <button className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600">
              收起
            </button>
          </div>

          <div className="space-y-3">
            <FieldRow
              label="向上采样提升 XAttn 精度"
              hint="(upcast-attention) 推荐保持开启，避免低精度下产生的噪点/坏点问题"
              labelWidth="w-52"
            >
              <div className="flex-1" />
              <Toggle checked={true} onChange={() => {}} />
            </FieldRow>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label="通用模型权重精度" labelWidth="w-40">
                <select className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none">
                  <option>默认 (Auto)</option>
                </select>
              </FieldRow>
              <FieldRow label="文本编码器精度" labelWidth="w-40">
                <select className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none">
                  <option>默认 (Auto)</option>
                </select>
              </FieldRow>
              <FieldRow label="UNET 精度" labelWidth="w-40">
                <select className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none">
                  <option>默认 (Auto)</option>
                </select>
              </FieldRow>
              <FieldRow label="VAE 解码器精度" labelWidth="w-40">
                <select className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none">
                  <option>默认 (Auto)</option>
                </select>
              </FieldRow>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-main)]">
          <Button variant="glass" size="sm">
            <RotateCcw size={13} />
            重置默认
          </Button>
          <Button variant="primary" size="sm">
            <Save size={13} />
            保存配置
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

function SoftwareTab({ lanEnabled, onToggleLan }) {
  return (
    <div className="space-y-5">
      <SectionCard title="系统与网络配置" desc="系统路径，代理与偏好设置">
        <div className="space-y-4">
          <div className="pt-1">
            <h4 className="section-title mb-3">基础运行环境</h4>
            <div className="space-y-3">
              <FieldRow label="ComfyUI 根目录">
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>
              <FieldRow label="主 Python">
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FileText size={13} />
                  浏览文件
                </Button>
              </FieldRow>
              <FieldRow label="副 Python">
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FileText size={13} />
                  浏览文件
                </Button>
              </FieldRow>
              <FieldRow label="# 运行端口">
                <TextInput placeholder="8188" className="max-w-[160px]" />
                <Button variant="glass" size="sm">
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>
              <FieldRow label="共享模型目录" hint="例如 F:\ComfyUIModels">
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>
              <FieldRow
                label="模型路径扩展"
                hint="保留现有 models，并添加其它位置的模型路径"
                labelWidth="w-44"
              >
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>
              <FieldRow label="共享插件目录" hint="例如 F:\ComfyUICustomNodes">
                <TextInput placeholder="未配置" />
                <Button variant="glass" size="sm">
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>
              <FieldRow label="自定义启动参数">
                <TextInput placeholder="未配置" />
              </FieldRow>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-main)]">
            <FieldRow label="远程访问 (127.0.0.1)">
              <div className="flex-1" />
            </FieldRow>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-main)] w-36 shrink-0">
                启用局域网访问 (--listen)
              </span>
              <Toggle checked={lanEnabled} onChange={onToggleLan} />
              <span className="text-[11px] text-[var(--text-sub)]">
                允许局域网内其它设备通过 IP 地址访问您的 ComfyUI
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] font-black text-[var(--text-sub)]">本机 IP 地址：</span>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-mono text-[var(--text-main)]">
                http://127.0.0.1:8188
              </span>
              <Button variant="glass" size="sm">
                刷新
              </Button>
              <Button variant="glass" size="sm">
                复制
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-main)]">
            <h4 className="section-title mb-3">网络代理设置</h4>
            <FieldRow label="代理地址">
              <TextInput placeholder="未配置，例如 http://127.0.0.1:7890" />
            </FieldRow>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-main)]">
            <Button variant="glass" size="sm">
              <RotateCcw size={13} />
              重置默认
            </Button>
            <Button variant="primary" size="sm">
              <Save size={13} />
              保存配置
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
