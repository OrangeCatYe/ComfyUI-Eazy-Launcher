import { useCallback, useState } from 'react'
import {
  FolderOpen,
  FileText,
  RotateCcw,
  Save,
  Gauge,
  ChevronDown,
  ChevronUp,
  Network,
  Zap,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { SectionCard, FieldRow } from '../components/ui/Blocks'
import { Toggle } from '../components/ui/Toggle'
import { useSettings } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'
import { pickDirectory, pickFile } from '../lib/picker'
import { OPTIONS, COMMON_PROXY_PORTS, API_PRESETS } from '../config/settings'
import cx from '../lib/cx'

/*
 * 全局设置 —— 6 张截图 + bundle_READY.js 字段名实证
 *
 * 性能优化 Tab：
 *   硬件调度与计算策略（5 下拉）+ 计算精度深度设置（可展开）
 *   + 启用共享显存 / 智能内存管理 / 强制使用 CPU 解码 VAE
 *
 * 软件设置 Tab（6 个分区）：
 *   1 基础运行环境（8 项路径参数）
 *   2 远程访问（局域网 + 本机 IP）
 *   3 网络代理设置（开关 + 地址 + 常用端口 + 连通测试）
 *   4 大模型 API（接口类型/Base Url/Api Key/快捷配置/模型名称）
 *   5 加速开关（HuggingFace 镜像 / PYPI 镜像）
 *   6 启动行为设置（5 开关）+ 个性设置（通知/软件锁/小秘书/缩放/关闭行为）
 */

const TABS = [
  { id: 'performance', label: '性能优化' },
  { id: 'software', label: '软件设置' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('performance')

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'press px-5 py-2 rounded-lg text-xs font-black transition-all',
              tab === t.id
                ? 'bg-indigo-500 text-white shadow'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'performance' ? <PerformanceTab /> : <SoftwareTab />}
    </div>
  )
}

/* ===================== 性能优化 ===================== */

function PerformanceTab() {
  const { settings, set } = useSettings()
  const [precisionOpen, setPrecisionOpen] = useState(true)

  return (
    <div className="space-y-5">
      <SectionCard title="硬件调度与计算策略">
        <div className="space-y-4">
          <FieldRow
            label="计算引擎选择"
            hint="为获得最佳效果，建议选择 NVIDIA 显卡作为计算引擎"
            labelWidth="w-52"
          >
            <Select
              value={settings.computeEngine}
              onChange={(v) => set('computeEngine', v)}
              options={OPTIONS.computeEngine}
            />
          </FieldRow>

          <FieldRow
            label="显存优化策略"
            hint="根据显存容量选择 CPU/GPU 分配策略"
            labelWidth="w-52"
          >
            <Select
              value={settings.vramMode}
              onChange={(v) => set('vramMode', v)}
              options={OPTIONS.vramMode}
            />
          </FieldRow>

          <FieldRow
            label="CUDA 分配策略"
            hint="遇到显存碎片化或 OOM 错误可尝试切换"
            labelWidth="w-52"
          >
            <Select
              value={settings.cudaMalloc}
              onChange={(v) => set('cudaMalloc', v)}
              options={OPTIONS.cudaMalloc}
            />
          </FieldRow>

          <FieldRow
            label="注意力计算方案（Cross-Attention）"
            hint="交叉注意力优化方案，有效降低显存用量"
            labelWidth="w-52"
          >
            <Select
              value={settings.attentionMode}
              onChange={(v) => set('attentionMode', v)}
              options={OPTIONS.attentionMode}
            />
          </FieldRow>

          <FieldRow
            label="预览图生成模式"
            hint="选择生成过程中预览图的生成方式"
            labelWidth="w-52"
          >
            <Select
              value={settings.previewMethod}
              onChange={(v) => set('previewMethod', v)}
              options={OPTIONS.previewMethod}
            />
          </FieldRow>

          {/* 计算精度深度设置 */}
          <div className="pt-4 border-t border-[var(--border-main)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-[var(--text-main)]">计算精度深度设置</h4>
              <button
                onClick={() => setPrecisionOpen((v) => !v)}
                className="press flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-600"
              >
                {precisionOpen ? '收起' : '展开'}
                {precisionOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {precisionOpen && (
              <div className="space-y-3">
                <FieldRow
                  label="向上采样提升 XAttn 精度"
                  hint="(upcast-attention) 推荐保持开启，避免低精度下产生的噪点/坏点问题"
                  labelWidth="w-52"
                >
                  <div className="flex-1" />
                  <Toggle
                    checked={settings.upcastAttention}
                    onChange={(v) => set('upcastAttention', v)}
                  />
                </FieldRow>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow label="通用模型权重精度" labelWidth="w-40">
                    <Select
                      value={settings.weightDtype}
                      onChange={(v) => set('weightDtype', v)}
                      options={OPTIONS.dtype}
                    />
                  </FieldRow>
                  <FieldRow label="文本编码器精度" labelWidth="w-40">
                    <Select
                      value={settings.textEncoderDtype}
                      onChange={(v) => set('textEncoderDtype', v)}
                      options={OPTIONS.dtype}
                    />
                  </FieldRow>
                  <FieldRow label="UNET 精度" labelWidth="w-40">
                    <Select
                      value={settings.unetDtype}
                      onChange={(v) => set('unetDtype', v)}
                      options={OPTIONS.dtype}
                    />
                  </FieldRow>
                  <FieldRow label="VAE 解码器精度" labelWidth="w-40">
                    <Select
                      value={settings.vaeDtype}
                      onChange={(v) => set('vaeDtype', v)}
                      options={OPTIONS.dtype}
                    />
                  </FieldRow>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 三个大开关：原版为整卡展示 */}
      <div className="space-y-3">
        <BigToggleCard
          icon={Zap}
          title="启用共享显存"
          desc="允许显存不足时借用系统内存，关闭后仅使用 GPU 显存运行"
          checked={settings.sharedVram}
          onChange={(v) => set('sharedVram', v)}
        />
        <BigToggleCard
          icon={Zap}
          title="智能内存管理"
          desc="关闭此选项，让 ComfyUI 更积极地把模型从显存挪到内存里"
          checked={settings.smartMemoryEnabled}
          onChange={(v) => set('smartMemoryEnabled', v)}
        />
        <BigToggleCard
          icon={Zap}
          title="强制使用 CPU 解码 VAE"
          desc="当显存不足时的兜底方案，开启后可让解码阶段不再占用显存资源"
          checked={settings.forceCpuVae}
          onChange={(v) => set('forceCpuVae', v)}
        />
      </div>

      <SaveBar />
    </div>
  )
}

/* ===================== 软件设置 ===================== */

function SoftwareTab() {
  const { settings, set } = useSettings()
  const { showToast } = useToast()
  const [lanIp, setLanIp] = useState('')
  const [ipLoading, setIpLoading] = useState(false)
  const [proxyTesting, setProxyTesting] = useState(false)

  /*
   * 真实获取本机局域网 IP
   * 通过 WebRTC 建立一次本地候选连接，从 ICE candidate 里读真实内网地址。
   * 这是浏览器环境下唯一无需后端即可拿到局域网 IP 的方式。
   * 拿不到就保持空，显示为 127.0.0.1，不做任何虚构。
   */
  const refreshLanIp = useCallback(() => {
    setIpLoading(true)
    let found = ''
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('probe')
      pc.onicecandidate = (e) => {
        if (!e.candidate || found) return
        const m = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
        if (m && m[1] !== '127.0.0.1') {
          found = m[1]
          setLanIp(found)
        }
      }
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(() => {})
      setTimeout(() => {
        try {
          pc.close()
        } catch {}
        setIpLoading(false)
        if (found) {
          showToast('success', '获取成功', `已探测到局域网地址 ${found}`)
        } else {
          showToast('alert', '未获取到', '未探测到局域网网卡地址，继续使用 127.0.0.1。')
        }
      }, 2500)
    } catch {
      setIpLoading(false)
      showToast('alert', '不支持', '当前浏览器不支持自动探测局域网地址。')
    }
  }, [showToast])

  return (
    <div className="space-y-5">
      {/* 1 基础运行环境 */}
      <SectionCard title="系统与网络配置" desc="系统路径，代理与偏好设置">
        <div className="space-y-4">
          <div>
            <h4 className="section-title mb-3">基础运行环境</h4>
            <div className="space-y-3">
              <FieldRow label="ComfyUI 根目录">
                <TextInput
                  value={settings.comfyRoot}
                  onChange={(e) => set('comfyRoot', e.target.value)}
                  placeholder="未配置"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) set('comfyRoot', p)
                  }}
                >
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>

              <FieldRow label="主 Python">
                <TextInput
                  value={settings.pythonPrimary}
                  onChange={(e) => set('pythonPrimary', e.target.value)}
                  placeholder="未配置"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const f = await pickFile('选择 Python 解释器', [['可执行文件', '*.exe'], ['所有文件', '*.*']])
                    if (f) set('pythonPrimary', f)
                  }}
                >
                  <FileText size={13} />
                  浏览文件
                </Button>
              </FieldRow>

              <FieldRow label="# 运行端口">
                <TextInput
                  value={settings.port}
                  onChange={(e) => set('port', e.target.value)}
                  placeholder="8188"
                  className="max-w-[160px]"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) set('port', p)
                  }}
                >
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>

              <FieldRow label="共享模型目录" hint="例如 F:\ComfyUIModels">
                <TextInput
                  value={settings.sharedModelDir}
                  onChange={(e) => set('sharedModelDir', e.target.value)}
                  placeholder="未配置"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) set('sharedModelDir', p)
                  }}
                >
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>

              <FieldRow
                label="模型路径扩展"
                hint="保留现有 models，并添加其它位置的模型路径"
                labelWidth="w-44"
              >
                <TextInput
                  value={settings.extraModelPaths}
                  onChange={(e) => set('extraModelPaths', e.target.value)}
                  placeholder="未配置"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) set('extraModelPaths', p)
                  }}
                >
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>

              <FieldRow label="共享插件目录" hint="例如 F:\ComfyUICustomNodes">
                <TextInput
                  value={settings.sharedPluginDir}
                  onChange={(e) => set('sharedPluginDir', e.target.value)}
                  placeholder="未配置"
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    const p = await pickDirectory()
                    if (p) set('sharedPluginDir', p)
                  }}
                >
                  <FolderOpen size={13} />
                  浏览目录
                </Button>
              </FieldRow>

              <FieldRow label="自定义启动参数">
                <TextInput
                  value={settings.customLaunchArgs}
                  onChange={(e) => set('customLaunchArgs', e.target.value)}
                  placeholder="未配置"
                />
              </FieldRow>
            </div>
          </div>

          {/* 2 远程访问 */}
          <div className="pt-4 border-t border-[var(--border-main)]">
            <h4 className="section-title mb-3">远程访问 (127.0.0.1)</h4>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-main)] w-44 shrink-0">
                启用局域网访问 (--listen)
              </span>
              <Toggle
                checked={settings.lanEnabled}
                onChange={(v) => set('lanEnabled', v)}
              />
              <span className="text-[11px] text-[var(--text-sub)]">
                允许局域网内其它设备通过 IP 地址访问您的 ComfyUI
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[var(--text-sub)]">本机 IP 地址：</span>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-mono text-[var(--text-main)]">
                {lanIp
                  ? `http://${lanIp}:${settings.port || '8188'}`
                  : `http://127.0.0.1:${settings.port || '8188'}`}
              </span>
              <Button variant="glass" size="sm" disabled={ipLoading} onClick={refreshLanIp}>
                <RefreshCw size={13} className={ipLoading ? 'animate-spin' : ''} />
                {ipLoading ? '获取中…' : '刷新'}
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={async () => {
                  const url = `http://${lanIp || '127.0.0.1'}:${settings.port || '8188'}`
                  try {
                    await navigator.clipboard.writeText(url)
                    showToast('success', '操作成功', `已复制 ${url}`)
                  } catch {
                    showToast('alert', '提示', `复制失败，请手动复制：${url}`)
                  }
                }}
              >
                复制
              </Button>
              <Button
                variant="glass"
                size="sm"
                disabled={ipLoading}
                onClick={async () => {
                  const url = `http://127.0.0.1:${settings.port || '8188'}`
                  setIpLoading(true)
                  try {
                    const controller = new AbortController()
                    const timer = setTimeout(() => controller.abort(), 4000)
                    await fetch(url, {
                      method: 'GET',
                      mode: 'no-cors',
                      cache: 'no-store',
                      signal: controller.signal,
                    })
                    clearTimeout(timer)
                    showToast('success', '服务可达', `${url} 有响应，ComfyUI 服务可能已启动。`)
                  } catch (e) {
                    showToast(
                      'alert',
                      '服务未响应',
                      e?.name === 'AbortError'
                        ? `${url} 连接超时，ComfyUI 服务可能未启动。`
                        : `${url} 无响应，ComfyUI 服务可能未启动。`
                    )
                  } finally {
                    setIpLoading(false)
                  }
                }}
              >
                探测服务
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-[var(--text-sub)]">
              {lanIp
                ? '局域网地址由浏览器真实探测得到；若只显示 127.0.0.1，说明未探测到局域网网卡。'
                : '尚未获取局域网地址，点击「刷新」由浏览器探测。'}
            </p>
          </div>

          {/* 3 网络代理设置 */}
          <div className="pt-4 border-t border-[var(--border-main)]">
            <h4 className="section-title mb-3">网络代理设置</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--text-main)] w-32 shrink-0">
                  启动网络代理
                </span>
                <Toggle
                  checked={settings.proxyEnabled}
                  onChange={(v) => set('proxyEnabled', v)}
                />
                <span
                  className={cx(
                    'text-[11px] font-black',
                    settings.proxyEnabled ? 'text-emerald-600' : 'text-[var(--text-sub)]'
                  )}
                >
                  {settings.proxyEnabled ? '开启' : '关闭'}
                </span>
              </div>

              <FieldRow label="代理地址">
                <TextInput
                  value={settings.proxyUrl}
                  onChange={(e) => set('proxyUrl', e.target.value)}
                  placeholder="例如 http://127.0.0.1:7890"
                />
              </FieldRow>

              <FieldRow label="常用端口">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COMMON_PROXY_PORTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => set('proxyUrl', `http://127.0.0.1:${p}`)}
                      className="press px-2.5 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black tnum text-[var(--text-sub)] hover:text-indigo-500 hover:border-indigo-400/50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="网络连通测试">
                <Button
                  variant="glass"
                  size="sm"
                  disabled={proxyTesting}
                  onClick={async () => {
                    const proxy = settings.proxyUrl?.trim()
                    setProxyTesting(true)
                    const target = proxy || 'https://www.baidu.com'
                    try {
                      /*
                       * 真实发起一次网络请求。
                       * 注意：浏览器层面无法真正走系统代理，这里测的是
                       * 「本机到目标地址的连通性」，不伪装成代理测试结果。
                       */
                      const controller = new AbortController()
                      const timer = setTimeout(() => controller.abort(), 6000)
                      const t0 = performance.now()
                      await fetch(target, {
                        method: 'GET',
                        mode: 'no-cors',
                        cache: 'no-store',
                        signal: controller.signal,
                      })
                      clearTimeout(timer)
                      const ms = Math.round(performance.now() - t0)
                      showToast(
                        'success',
                        '连通正常',
                        proxy
                          ? `到 ${proxy} 的真实往返耗时 ${ms}ms（注：浏览器无法强制走系统代理，此为直连探测结果）`
                          : `到 ${target} 的真实往返耗时 ${ms}ms`
                      )
                    } catch (e) {
                      const aborted = e?.name === 'AbortError'
                      showToast(
                        'error',
                        '无法连通',
                        aborted
                          ? `连接 ${target} 超时（>6000ms）`
                          : `连接 ${target} 失败：${e?.message || '网络错误'}`
                      )
                    } finally {
                      setProxyTesting(false)
                    }
                  }}
                >
                  <Network size={13} />
                  {proxyTesting ? '测试中…' : '开始测试'}
                </Button>
              </FieldRow>
            </div>
          </div>

          {/* 4 大模型 API */}
          <div className="pt-4 border-t border-[var(--border-main)]">
            <h4 className="section-title mb-3">大模型 API</h4>
            <div className="space-y-3">
              <FieldRow label="配置大模型 API" labelWidth="w-52">
                <div className="flex-1" />
              </FieldRow>

              <FieldRow label="接口类型">
                <Select
                  value={settings.apiType}
                  onChange={(v) => set('apiType', v)}
                  options={OPTIONS.apiType}
                  className="max-w-[220px]"
                />
              </FieldRow>

              <FieldRow label="Base Url">
                <TextInput
                  value={settings.apiBaseUrl}
                  onChange={(e) => set('apiBaseUrl', e.target.value)}
                  placeholder="https://api-inference.modelscope.cn/v1"
                />
              </FieldRow>

              <FieldRow
                label="Api Key"
                hint="远程服务通常必填，本地接口可留空"
              >
                <TextInput
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => set('apiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </FieldRow>

              <FieldRow label="快捷配置">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {API_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => p.url && set('apiBaseUrl', p.url)}
                      className="press px-2.5 py-1 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-sub)] hover:text-indigo-500 hover:border-indigo-400/50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="模型名称">
                <TextInput
                  value={settings.apiModel}
                  onChange={(e) => set('apiModel', e.target.value)}
                  placeholder="输入或选择模型..."
                />
              </FieldRow>
            </div>
          </div>

          {/* 5 加速开关 */}
          <div className="pt-4 border-t border-[var(--border-main)] space-y-3">
            <SwitchRow
              label="启用 Hugging Face 国内镜像源"
              desc="运行工作流时自动从 hf-mirror.com 下载模型"
              checked={settings.hfMirror}
              onChange={(v) => set('hfMirror', v)}
            />
            <SwitchRow
              label="启用 PYPI 镜像源加速"
              desc={settings.pypiMirror ? '当前正使用国内镜像源加速' : '当前未启用镜像源加速'}
              checked={settings.pypiMirror}
              onChange={(v) => set('pypiMirror', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* 6 启动行为设置 */}
      <SectionCard title="启动行为设置">
        <div className="space-y-3">
          <SwitchRow
            label="默认启动浏览器"
            desc="启动时遵循官方 --auto-launch 自动打开系统默认浏览器"
            checked={settings.autoLaunchBrowser}
            onChange={(v) => set('autoLaunchBrowser', v)}
          />
          <SwitchRow
            label="自动检查插件更新"
            desc="每次启动软件后自动检查已安装插件的更新状态"
            checked={settings.autoCheckPluginUpdate}
            onChange={(v) => set('autoCheckPluginUpdate', v)}
          />
          <SwitchRow
            label="自动检测插件依赖(实验性功能)"
            desc="启动 ComfyUI 前自动扫描并尝试修复缺失依赖"
            checked={settings.autoDetectDeps}
            onChange={(v) => set('autoDetectDeps', v)}
          />
          <SwitchRow
            label="自动清理旧窗口占用"
            desc="每次启动自动清理 8188 端口残留进程"
            checked={settings.autoCleanPort}
            onChange={(v) => set('autoCleanPort', v)}
          />
          <SwitchRow
            label="快捷切换整合包"
            desc="在主页快速切换 ComfyUI 与 Python 路径"
            checked={settings.quickSwitch}
            onChange={(v) => set('quickSwitch', v)}
          />
        </div>
      </SectionCard>

      {/* 7 个性设置 */}
      <SectionCard title="个性设置">
        <div className="space-y-4">
          <SwitchRow
            label="运行完毕通知"
            desc="队列任务完成后发送系统通知"
            checked={settings.notifyOnFinish}
            onChange={(v) => set('notifyOnFinish', v)}
          />
          <SwitchRow
            label="软件锁"
            desc="启用后需要四位数密码解锁，默认使用 CTRL+K 锁定/解锁"
            checked={settings.appLock}
            onChange={(v) => set('appLock', v)}
          />
          <SwitchRow
            label="ComfyUI 智能小秘书"
            desc="启动 ComfyUI 后显示悬浮按钮，并提供智能助手能力"
            checked={settings.assistantEnabled}
            onChange={(v) => set('assistantEnabled', v)}
          />

          <div className="pt-4 border-t border-[var(--border-main)] space-y-3">
            <FieldRow label="全局界面缩放" hint="统一调节软件字体大小与整体界面布局缩放" labelWidth="w-44">
              <Select
                value={settings.uiScale}
                onChange={(v) => set('uiScale', v)}
                options={OPTIONS.uiScale}
                className="max-w-[200px]"
              />
            </FieldRow>

            <FieldRow label="关闭按钮行为" hint="点击标题栏关闭按钮时的默认操作" labelWidth="w-44">
              <Select
                value={settings.closeBehavior}
                onChange={(v) => set('closeBehavior', v)}
                options={OPTIONS.closeBehavior}
                className="max-w-[200px]"
              />
            </FieldRow>
          </div>
        </div>
      </SectionCard>

      <SaveBar />
    </div>
  )
}

/* ===================== 共用件 ===================== */

function SaveBar() {
  /* set 必须一并解构：下方「导入配置」要靠它逐项写回设置。
   * 漏解构会导致 set is not defined，且该错误发生在渲染阶段，
   * 会把整个设置页打挂。 */
  const { settings, set, reset } = useSettings()
  const { showToast } = useToast()

  /*
   * 真实导出配置文件
   * 设置本身是即时写入 localStorage 的，这个按钮做的是
   * 「导出一份可备份/迁移的 JSON 文件」，是真实的文件产出。
   */
  const exportConfig = useCallback(() => {
    const text = JSON.stringify(settings, null, 2)
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    a.href = url
    a.download = `kk-settings-${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', '已导出', `配置已导出为 kk-settings-${ts}.json`)
  }, [settings, showToast])

  /* 导入配置文件，真实读取并校验后写入 */
  const importConfig = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      try {
        const text = await f.text()
        const obj = JSON.parse(text)
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          showToast('alert', '格式错误', '文件内容不是一个有效的配置对象。')
          return
        }
        let n = 0
        Object.entries(obj).forEach(([k, v]) => {
          set(k, v)
          n += 1
        })
        showToast('success', '导入成功', `已从 ${f.name} 导入 ${n} 项配置。`)
      } catch (e) {
        showToast('alert', '导入失败', `无法解析该文件：${e?.message || 'JSON 格式错误'}`)
      }
    }
    input.click()
  }, [set, showToast])

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="glass"
        size="sm"
        onClick={() => {
          if (!window.confirm('确定要恢复默认设置吗？当前所有配置将被清空。')) return
          reset()
          showToast('success', '操作成功', '已恢复默认设置')
        }}
      >
        <RotateCcw size={13} />
        重置默认
      </Button>
      <Button variant="glass" size="sm" onClick={importConfig}>
        <Upload size={13} />
        导入配置
      </Button>
      <Button variant="primary" size="sm" onClick={exportConfig}>
        <Save size={13} />
        导出配置
      </Button>
    </div>
  )
}

function Select({ value, onChange, options, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-indigo-400 cursor-pointer',
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* 带描述文本的开关行（左文案 + 右开关） */
function SwitchRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-xs font-bold text-[var(--text-main)]">{label}</div>
        {desc && <div className="mt-0.5 text-[11px] text-[var(--text-sub)] leading-tight">{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

/* 整卡式大开关（性能优化页三个兜底策略） */
function BigToggleCard({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 flex items-start justify-between gap-4 shadow-[0_2px_12px_var(--shadow-color)]">
      <div className="flex gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--text-main)]">{title}</div>
          <div className="mt-1 text-[11px] text-[var(--text-sub)] leading-relaxed">{desc}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}
