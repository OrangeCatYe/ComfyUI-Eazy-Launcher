import { useState } from 'react'
import { Power, Clock, Activity, Cpu } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Blocks'

/*
 * 自动关机任务 —— 依据「自动关机任务.png」
 *
 * 结构：
 *   1. 当前状态：监测状态：未开启 | 当前任务：未开启
 *   2. 定时关机任务：时间设置（月/日/时/分）+ 当前设置 + 开始任务
 *   3. 空闲时自动关机：GPU 利用率低于阈值 % 后 N 分钟
 *      + 当前 GPU 利用率：未获取 + 开始任务
 *   4. ComfyUI 空闲关机：空闲 30 分钟后自动关机 + 当前 ComfyUI 状态 + 开始任务
 *
 * 数据策略：静态默认值，状态为「未开启」
 */

export default function AutoShutdownPage() {
  const [month, setMonth] = useState('09')
  const [day, setDay] = useState('01')
  const [hour, setHour] = useState('14')
  const [minute, setMinute] = useState('57')
  const [threshold, setThreshold] = useState(10)
  const [idleMinutes, setIdleMinutes] = useState(30)
  const [comfyIdle, setComfyIdle] = useState(30)

  const currentSetting = `${month}月${day}日${hour}点${minute}分`

  return (
    <div className="p-6 space-y-5">
      <SectionCard title="当前状态">
        <div className="flex items-center gap-8 flex-wrap">
          <StatusField label="监测状态" value="未开启" />
          <StatusField label="当前任务" value="未开启" />
        </div>
      </SectionCard>

      {/* 定时关机 */}
      <TaskCard
        icon={Clock}
        title="定时关机任务"
        desc="设置指定时间触发自动关机。"
        statusLabel="当前设置"
        statusValue={currentSetting}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black text-[var(--text-sub)]">时间设置</span>
          <NumSelect value={month} onChange={setMonth} options={months()} suffix="月" />
          <NumSelect value={day} onChange={setDay} options={range(1, 31)} suffix="日" />
          <NumSelect value={hour} onChange={setHour} options={range(0, 23)} suffix="时" />
          <NumSelect value={minute} onChange={setMinute} options={range(0, 59)} suffix="分" />
        </div>
      </TaskCard>

      {/* GPU 空闲关机 */}
      <TaskCard
        icon={Activity}
        title="空闲时自动关机"
        desc="根据空闲条件触发自动关机。"
        statusLabel="当前GPU利用率"
        statusValue="未获取"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black text-[var(--text-sub)]">GPU利用率低于</span>
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 px-3 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-black tnum text-[var(--text-main)] outline-none focus:border-indigo-400"
          />
          <span className="text-[11px] font-black text-[var(--text-sub)]">%</span>
          <span className="text-[11px] font-black text-[var(--text-sub)]">后</span>
          <NumSelect
            value={idleMinutes}
            onChange={(v) => setIdleMinutes(Number(v))}
            options={[10, 20, 30, 45, 60]}
            suffix="分钟"
          />
        </div>
        <div className="mt-1.5 text-[10px] text-[var(--text-sub)]">持续空闲后自动关机。</div>
      </TaskCard>

      {/* ComfyUI 空闲关机 */}
      <TaskCard
        icon={Cpu}
        title="ComfyUI 空闲关机"
        desc="无队列任务时触发关机。"
        statusLabel="当前ComfyUI状态"
        statusValue="未启动"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black text-[var(--text-sub)]">空闲</span>
          <NumSelect
            value={comfyIdle}
            onChange={(v) => setComfyIdle(Number(v))}
            options={[10, 20, 30, 45, 60]}
            suffix="分钟"
          />
          <span className="text-[11px] font-black text-[var(--text-sub)]">后自动关机</span>
        </div>
      </TaskCard>
    </div>
  )
}

function months() {
  return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
}

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function NumSelect({ value, onChange, options, suffix }) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={pad(value)}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-black tnum text-[var(--text-main)] outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={pad(o)}>
            {pad(o)}
          </option>
        ))}
      </select>
      {suffix && <span className="text-[11px] font-black text-[var(--text-sub)]">{suffix}</span>}
    </div>
  )
}

function StatusField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--text-sub)]">{label}</div>
      <div className="mt-0.5 text-sm font-black text-[var(--text-main)]">{value}</div>
    </div>
  )
}

function TaskCard({ icon: Icon, title, desc, statusLabel, statusValue, children }) {
  return (
    <SectionCard>
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-indigo-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-[var(--text-main)]">{title}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-sub)]">{desc}</div>

          <div className="mt-3">{children}</div>

          <div className="mt-3 pt-3 border-t border-[var(--border-main)] flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] text-[var(--text-sub)]">
              {statusLabel}：<span className="font-black tnum text-[var(--text-main)]">{statusValue}</span>
            </span>
            <Button variant="primary" size="sm">
              <Power size={13} />
              开始任务
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
