import { useState } from 'react'
import {
  PackageSearch,
  FileText,
  Search,
  Download,
  Upload,
  Terminal,
  Save,
  RotateCcw,
  Gauge,
  Copy,
  Eraser,
  Check,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { SectionCard, FieldRow } from '../components/ui/Blocks'
import { pickFile } from '../lib/picker'

/*
 * 真实测量单个镜像源的往返耗时
 *
 * 用 no-cors 模式请求，规避跨域限制：能发出请求即代表网络可达，
 * performance.now() 前后差值就是真实的往返耗时。
 * 若请求被拒绝（断网 / DNS 失败 / 源不可达），如实返回不可达。
 */
async function measureMirror(mirror, timeoutMs = 6000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const t0 = performance.now()
  try {
    await fetch(mirror.url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })
    const ms = performance.now() - t0
    return { name: mirror.name, reachable: true, ms, secs: (ms / 1000).toFixed(3) }
  } catch (e) {
    const aborted = e?.name === 'AbortError'
    return {
      name: mirror.name,
      reachable: false,
      ms: Infinity,
      reason: aborted ? `超时（>${timeoutMs}ms）` : '不可达（网络错误或被拦截）',
    }
  } finally {
    clearTimeout(timer)
  }
}

/*
 * 环境依赖 —— 依据「环境依赖.png」
 *
 * 结构（5 个区块，全部为页面内操作，输出走右侧终端）：
 *   1. PYPI 镜像源与测速
 *   2. 检测依赖文件
 *   3. ComfyUI 环境操作
 *   4. 第三方库管理
 *   5. 终端命令行
 *   6. 环境快照备份
 *
 * 注意：环境比较工具 / 查询引用插件 为终端交互（S4 实现）
 *       恢复快照依赖 在页面内渲染差异分组（S4 实现）
 *
 * 数据策略：空状态优先
 */

/*
 * 镜像源列表 —— 每项都带真实可请求的 URL
 * 测速结果来自真实的 HTTP 请求往返耗时，不做任何随机生成。
 */
const MIRRORS = [
  { name: '阿里云', url: 'https://mirrors.aliyun.com/pypi/simple/' },
  { name: '清华大学', url: 'https://pypi.tuna.tsinghua.edu.cn/simple/' },
  { name: '腾讯云', url: 'https://mirrors.cloud.tencent.com/pypi/simple/' },
  { name: '华为云', url: 'https://repo.huaweicloud.com/repository/pypi/simple/' },
  { name: '官方源', url: 'https://pypi.org/simple/' },
]

export default function DepsPage({ onAction, logs = [] }) {
  /*
   * mirror 存的是镜像源**名称**（字符串），不是整个对象。
   *
   * 历史缺陷：初值写成 useState(MIRRORS[0])，即整个 {name,url} 对象。
   * <option value={对象}> 会让 React 尝试把对象当作 children 渲染，
   * 抛出 Minified React error #31（objects are not valid as a React child）。
   * 而测速完成后 setMirror(best.name) 存的却是字符串 —— 两处本就不一致，
   * 初值改成名称字符串后，读写两侧才真正对齐。
   */
  const [mirror, setMirror] = useState(MIRRORS[0].name)
  const [speed, setSpeed] = useState(null)
  const [testing, setTesting] = useState(false)
  const [reqFile, setReqFile] = useState(null)
  const [libName, setLibName] = useState('')
  const [libVersion, setLibVersion] = useState('latest')
  const [copied, setCopied] = useState(false)

  const fire = (name, payload) => onAction && onAction(name, payload)

  /*
   * 镜像源测速 —— 真实发起 HTTP 请求，测量往返耗时
   *
   * 说明：这是一次真实的网络请求，测的是浏览器到各镜像源的实际延迟。
   * 若某个源因跨域策略（CORS）无法从前端直接访问，则标记为「不可达」，
   * 不用随机数代替——测不到就是测不到，如实呈现。
   */
  const runSpeedTest = async () => {
    if (testing) return
    setTesting(true)
    setSpeed(null)
    fire('speedTest')
    fire('speedTestNote')

    const results = []
    for (const m of MIRRORS) {
      const r = await measureMirror(m)
      results.push(r)
      if (r.reachable) {
        fire('speedTestOne', { mirror: m.name, secs: r.secs })
      } else {
        fire('speedTestFail', { mirror: m.name, reason: r.reason })
      }
    }

    /* 只在真实测通的源里选最快的；一个都不通则不切换 */
    const ok = results.filter((r) => r.reachable)
    if (ok.length === 0) {
      setSpeed(null)
      fire('speedTestAllFail')
    } else {
      const best = ok.reduce((a, b) => (a.ms < b.ms ? a : b))
      setMirror(best.name)
      setSpeed(best.secs)
      fire('speedTestDone', { mirror: best.name, secs: best.secs })
    }
    setTesting(false)
  }

  /* 复制日志信息 */
  const copyLogs = async () => {
    const text = logs.map((l) => (typeof l === 'string' ? l : l.text)).join('\n')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      fire('copyLog')
    } catch {
      fire('copyLogFail')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* 1. PYPI 镜像源与测速 */}
      <SectionCard title="PYPI 镜像源与测速">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={mirror}
            onChange={(e) => setMirror(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-indigo-400"
          >
            {MIRRORS.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          {speed !== null && (
            <span className="text-[11px] font-black text-emerald-600 tnum">({speed} 秒)</span>
          )}
          <Button variant="glass" size="sm" onClick={() => fire('applyMirror', mirror)}>
            应用源
          </Button>
          <Button variant="glass" size="sm" onClick={runSpeedTest} disabled={testing}>
            <Gauge size={13} className={testing ? 'animate-spin' : ''} />
            {testing ? '测速中...' : '测速'}
          </Button>
        </div>
        {testing && (
          <div className="mt-2 text-[11px] text-[var(--text-sub)]">
            正在依次测速 {MIRRORS.length} 个镜像源，完成后自动切换至最快源...
          </div>
        )}
      </SectionCard>

      {/* 2. 检测依赖文件 */}
      <SectionCard title="检测依赖文件">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-dashed border-[var(--border-main)]">
            <FileText size={14} className="text-[var(--text-sub)] shrink-0" />
            <span className="text-xs text-[var(--text-sub)] truncate flex-1">
              {reqFile || '未选择 requirements.txt 文件'}
            </span>
            <Button
              variant="glass"
              size="sm"
              onClick={async () => {
                const f = await pickFile('.txt')
                if (f) setReqFile(f)
              }}
            >
              选择文件
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="glass" size="sm" onClick={() => fire('analyzeReq')}>
              <Search size={13} />
              分析依赖文件
            </Button>
            <Button variant="glass" size="sm" onClick={() => fire('checkConflict')}>
              检测冲突缺失
            </Button>
            <Button variant="primary" size="sm" onClick={() => fire('installDeps')}>
              <Download size={13} />
              依赖实际安装
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* 3. ComfyUI 环境操作 */}
      <SectionCard title="ComfyUI 环境操作">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="glass" size="sm" onClick={() => fire('viewEnv')}>
            查看当前环境
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('findConflict')}>
            查找环境冲突
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('compareEnv')}>
            环境比较工具
          </Button>
        </div>
      </SectionCard>

      {/* 4. 第三方库管理 */}
      <SectionCard title="第三方库管理">
        <div className="space-y-3">
          <FieldRow label="库名：">
            <TextInput
              value={libName}
              onChange={(e) => setLibName(e.target.value)}
              placeholder="输入库名(如: numpy)..."
            />
            <Button variant="glass" size="sm" onClick={() => fire('findRefs', libName)}>
              <Search size={13} />
              搜索
            </Button>
            <Button variant="glass" size="sm" onClick={() => fire('findRefs', libName)}>
              查询引用插件
            </Button>
          </FieldRow>

          <FieldRow label="版本：">
            <TextInput
              value={libVersion}
              onChange={(e) => setLibVersion(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="primary" size="sm" onClick={() => fire('installLib', libName)}>
              安装选中
            </Button>
            <Button variant="danger" size="sm" onClick={() => fire('uninstallLib', libName)}>
              卸载选中
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={async () => {
                const f = await pickFile('.whl')
                if (f) fire('installWhl', f)
              }}
            >
              安装轮子.whl
            </Button>
          </FieldRow>
        </div>
      </SectionCard>

      {/* 5. 终端命令行 */}
      <SectionCard title="终端命令行">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="glass" size="sm" onClick={() => fire('startTerminal')}>
            <Terminal size={13} />
            启动终端
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('sampleCmd')}>
            示例命令
          </Button>
        </div>
      </SectionCard>

      {/* 6. 环境快照备份 */}
      <SectionCard title="环境快照备份">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => fire('backupEnv')}>
            <Save size={13} />
            备份当前环境
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('restoreSnapshot')}>
            <RotateCcw size={13} />
            恢复快照依赖
          </Button>
        </div>
      </SectionCard>

      {/* 7. 输出日志与结果 —— 依据「环境依赖.png」右下角 */}
      <SectionCard
        title="输出日志与结果"
        action={
          <div className="flex items-center gap-1">
            <Button variant="glass" size="sm" onClick={copyLogs} disabled={logs.length === 0}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? '已复制' : '复制日志信息'}
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => fire('clearLog')}
              disabled={logs.length === 0}
            >
              <Eraser size={13} />
              清空日志信息
            </Button>
          </div>
        }
      >
        <div
          className="thin-scroll max-h-72 overflow-y-auto rounded-xl border border-[var(--border-main)] p-3.5 font-mono text-[11px] leading-relaxed"
          style={{ background: 'var(--bg-main)' }}
        >
          {logs.length === 0 ? (
            <div className="text-[var(--text-sub)] opacity-60">
              [READY] 环境管理器已就绪
              {'\n'}[TIPS] 变更依赖前，建议先执行「备份当前环境」
            </div>
          ) : (
            logs.map((line, i) => {
              const text = typeof line === 'string' ? line : line.text
              const lvl = typeof line === 'string' ? null : line.level
              return (
                <div
                  key={i}
                  className={
                    lvl === 'cmd'
                      ? 'text-[var(--accent)] font-bold whitespace-pre-wrap break-all'
                      : lvl === 'success'
                        ? 'text-[var(--success)] whitespace-pre-wrap break-all'
                        : lvl === 'warning'
                          ? 'text-[var(--text-warning)] whitespace-pre-wrap break-all'
                          : lvl === 'error'
                            ? 'text-[var(--danger)] whitespace-pre-wrap break-all'
                            : 'text-[var(--text-main)] opacity-80 whitespace-pre-wrap break-all'
                  }
                >
                  {text || ' '}
                </div>
              )
            })
          )}
        </div>
      </SectionCard>
    </div>
  )
}
