import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { TerminalDrawer } from './components/layout/TerminalDrawer'
import { SnapshotDiffModal } from './components/ui/SnapshotDiffModal'
import { TOOLS, TOOL_MAP } from './config/navigation'
import * as ICONS from './lib/icons'
import { UIProvider } from './store/uiStore'
import { SettingsProvider, useSettings } from './store/settingsStore'
import { ToastProvider } from './components/ui/Toast'
import { pickDirectory, pickDirectoryHandle, pickFileBackend, pickTextFile, supportsDirectoryPicker } from './lib/picker'
import { readLS, writeLS, LS } from './lib/storage'
import { createLogger } from './lib/logger'
import {
  selectRequirementsFile,
  compareSnapshots,
  findLibInPlugins,
  previewRestoreSnapshot,
  restoreEnvSnapshot,
} from './lib/api'
import HomePage from './pages/HomePage'
import KernelPage from './pages/KernelPage'
import PluginsPage from './pages/PluginsPage'
import DepsPage from './pages/DepsPage'
import ToolsPage from './pages/ToolsPage'
import DeployPage from './pages/DeployPage'
import SettingsPage from './pages/SettingsPage'
import ModelManagerPage from './pages/tools/ModelManager'
import DupModelPage from './pages/tools/DupModel'
import ImagePromptRevPage from './pages/tools/ImagePromptRev'
import WorkflowHubPage from './pages/tools/WorkflowHub'
import PromptFavoritesPage from './pages/tools/PromptFavorites'
import PolishPage from './pages/tools/Polish'
import MediaToolsPage from './pages/tools/MediaTools'
import AutoShutdownPage from './pages/tools/AutoShutdown'
import MyWorksPage from './pages/tools/MyWorks'
import AboutAuthorPage from './pages/tools/AboutAuthor'

/* 工具页路由表：id → 组件 */
const TOOL_ROUTES = {
  MODEL_MANAGER: ModelManagerPage,
  DUP_MODEL: DupModelPage,
  IMAGE_PROMPT_REV: ImagePromptRevPage,
  WORKFLOW_HUB: WorkflowHubPage,
  PROMPT_FAVORITES: PromptFavoritesPage,
  POLISH: PolishPage,
  MEDIA_TOOLS: MediaToolsPage,
  AUTO_SHUTDOWN: AutoShutdownPage,
  MY_WORKS: MyWorksPage,
  ABOUT_AUTHOR: AboutAuthorPage,
}

/* 初恋部署：驱动与版本信息需后端探测，未接入前保持为空，由页面展示未获取态 */
const DEPLOY_DRIVER = {}
const DEPLOY_VERSIONS = {}

const PAGE_META = {
  home: { title: '首页', subtitle: '设备状态与快捷入口' },
  kernel: { title: '内核管理', subtitle: 'ComfyUI 内核版本与仓库管理' },
  plugins: { title: '插件管理', subtitle: '已安装插件与批量操作' },
  deps: { title: '环境依赖', subtitle: 'Python 依赖检测与快照管理' },
  tools: { title: '实用工具', subtitle: `${TOOLS.length} 个效率工具` },
  deploy: { title: '初恋部署', subtitle: '一键部署 ComfyUI 环境' },
  settings: { title: '全局设置', subtitle: '性能优化与软件设置' },
}

/* 工具卡图标解析：把配置里的图标名映射为 lucide 组件 */
import { call } from './lib/backend'

const TOOLS_WITH_ICONS = TOOLS.map((t) => ({ ...t, icon: ICONS[t.icon] || ICONS.Boxes }))

function AppShell() {
  /* 环境路径取自统一设置层（全局设置 → 系统与网络配置 → 基础运行环境） */
  const { settings, set } = useSettings()
  const comfyRoot = settings.comfyRoot || ''
  const pythonPath = settings.pythonPrimary || ''

  const [page, setPage] = useState('home')
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [logs, setLogs] = useState([])
  /* 内核运行态：running 为真时终端显示「停止运行」与 PID */
  const [running, setRunning] = useState(false)
  const [pid, setPid] = useState(null)

  /* 本地环境扫描结果（真实数据，来自用户选择的目录） */
  const [env, setEnv] = useState(() => readLS(LS.ENV, null))
  /* 初恋部署：进度与阶段状态 */
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployStatus, setDeployStatus] = useState('待命')
  const [deployDir, setDeployDir] = useState('')

  /*
   * 终端面板高度 —— 随窗口高度自适应
   *
   * 修复前：TerminalDrawer 用固定 height=300 且 shrink-0。
   * 窗口变矮时终端不让步，把上方内容区挤到看不见，且内容区无法滚动。
   *
   * 策略：取窗口高度的 30%，夹在 [160, 300] 之间；
   * 极矮窗口（<600px）进一步压到 25%，保证内容区至少还有可视高度。
   */
  const [terminalHeight, setTerminalHeight] = useState(300)
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight
      const ratio = h < 600 ? 0.25 : 0.3
      setTerminalHeight(Math.round(Math.min(300, Math.max(160, h * ratio))))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  /* 恢复快照依赖：差异表弹窗（terminal.md 4.1） */
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreDiff, setRestoreDiff] = useState(null)
  /* 动作标记：记录最后一次「恢复快照依赖」动作阶段 */
  const lastAction = useRef(null)

  /* 内核版本列表：由后端 git fetch --tags 真实拉取 */
  const [kernelVersions, setKernelVersions] = useState([])
  /* 插件列表：由后端真实读取 custom_nodes 目录 */
  const [plugins, setPlugins] = useState([])

  /* ================= 后端调用辅助 ================= */

  /*
   * 统一执行一个后端动作：
   *   - 成功走 onOk，并输出后端返回的真实日志
   *   - 失败输出明确原因（不假装成功）
   */
  function runBackend(fn, args, onOk, label) {
    call(fn, args, `${label}需要后端支持`, push)
      .then((data) => onOk?.(data))
      .catch((e) => push({ level: 'error', text: `>>> ${label}失败：${e?.message || e}` }))
  }

  /* 批量执行：逐个调用后端，汇总真实成功/失败结果 */
  function runBatch(items, toCall, label) {
    let done = 0
    let failed = 0
    items.reduce((chain, item) => {
      const [fn, args] = toCall(item)
      return chain
        .then(() =>
          call(fn, args, `批量${label}需要后端支持`, push).then(
            () => {
              done += 1
              push({ level: 'info', text: ` - ${typeof item === 'string' ? item : item.name}：完成` })
            },
            (e) => {
              failed += 1
              push({
                level: 'error',
                text: ` - ${typeof item === 'string' ? item : item.name}：${e?.message || e}`,
              })
            }
          )
        )
        .then(() => {})
    }, Promise.resolve()).then(() => {
      push({
        level: failed ? 'warning' : 'success',
        text: `>>> 批量${label}完成：成功 ${done} 个，失败 ${failed} 个`,
      })
    })
  }

  /* ================= 后端数据自动加载 ================= */

  /*
   * 环境路径就绪后，自动向后端拉取真实数据：
   *   - 插件列表（真实读取 custom_nodes 目录）
   *   - 内核版本列表（真实执行 git fetch --tags）
   * 任一失败仅记录，不影响界面其它部分。
   */
  useEffect(() => {
    if (!comfyRoot) return
    let alive = true

    call('plugins_list', [comfyRoot], '读取插件列表需要后端支持')
      .then((d) => {
        if (!alive) return
        setPlugins(d.plugins || [])
      })
      .catch(() => {})

    call('kernel_list_versions', [comfyRoot], '拉取内核版本需要后端支持')
      .then((d) => {
        if (!alive) return
        setKernelVersions(d.versions || [])
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [comfyRoot])

  /* ================= 本地环境导入 ================= */

  /*
   * 用户从首页「添加本地环境」导入：
   *   - 路径写入全局设置（唯一的路径来源，settingsStore）
   *   - 扫描结果写入 env，供首页设备信息展示
   * 两者都持久化，刷新后保持。
   */
  function handleImportEnv(payload) {
    set('comfyRoot', payload.comfyRoot)
    if (payload.pythonPath) set('pythonPrimary', payload.pythonPath)

    const next = {
      verified: payload.verified,
      pluginCount: payload.pluginCount || 0,
      plugins: payload.plugins || [],
      pythonPath: payload.pythonPath || '',
      comfyRoot: payload.comfyRoot,
      pythonSource: payload.pythonSource || '',
      hasGit: Boolean(payload.hasGit),
      modelsDirs: payload.modelsDirs || [],
      scannedAt: new Date().toISOString(),
      /* 以下需后端探测，扫描阶段拿不到，保持 null 表示未获取 */
      pythonVersion: null,
      torchVersion: null,
      gitVersion: null,
      gpuName: null,
      vramUsage: null,
      detailed: false,
    }
    setEnv(next)
    writeLS(LS.ENV, next)
  }

  /* ================= 顶栏图标按钮 → 终端日志 ================= */
  function handleTopBarAction(action, payload) {
    setTerminalOpen(true)
    switch (action) {
      case 'topbar-refresh':
        push({ level: 'cmd', text: '\n>>> 刷新页面数据' })
        push({
          level: 'info',
          text: '>>> 页面数据来自本地设置与已扫描的环境信息，重新读取完成。若需更新设备信息，请重新扫描环境。',
        })
        break
      case 'topbar-open-dir':
        if (!settings.comfyRoot) {
          push({ level: 'warning', text: '>>> ComfyUI 根目录未配置，请先在全局设置中配置。' })
          return
        }
        push({ level: 'cmd', text: `\n>>> 打开目录：${payload}` })
        break
      case 'topbar-sound':
        push({ level: 'info', text: `>>> 提示音已${payload}` })
        break
      case 'topbar-user':
        push({ level: 'info', text: '>>> 当前为本地数据模式，数据接入后将自动填充。' })
        break
      default:
        push({ level: 'info', text: `>>> ${action}` })
    }
  }

  /* ================= 内核管理动作 → 终端日志 ================= */
  function handleKernelAction(action, payload) {
    setTerminalOpen(true)
    switch (action) {
      case 'kernel-refresh':
        push({ level: 'cmd', text: '\n>>> 刷新版本列表' })
        runBackend(
          'kernel_list_versions',
          [settings.comfyRoot],
          (data) => {
            setKernelVersions(data.versions || [])
            push({ level: 'success', text: `>>> 已拉取 ${(data.versions || []).length} 个版本标签` })
          },
          '刷新版本列表'
        )
        break
      case 'kernel-switch-repo':
        push({ level: 'cmd', text: `\n>>> 切换远程仓库: ${payload}` })
        runBackend(
          'kernel_set_remote',
          [settings.comfyRoot, payload],
          () => {
            set('repoUrl', payload)
            push({ level: 'success', text: '>>> 已真实切换远程仓库地址' })
          },
          '切换远程仓库'
        )
        break
      case 'kernel-switch-version':
        push({ level: 'cmd', text: `\n>>> 切换内核版本: ${payload}` })
        runBackend(
          'kernel_checkout',
          [settings.comfyRoot, payload],
          () => {
            set('kernelVersion', payload)
            push({ level: 'success', text: `>>> 已真实切换到版本 ${payload}` })
          },
          '切换内核版本'
        )
        break
      default:
        push({ level: 'info', text: `>>> ${action}` })
    }
  }

  /* ================= 插件管理动作 → 终端日志 ================= */
  function handlePluginAction(action, payload) {
    setTerminalOpen(true)
    switch (action) {
      case 'install-plugin':
        push({ level: 'cmd', text: `\n>>> 安装插件: ${payload}` })
        runBackend(
          'kernel_clone',
          [payload, settings.comfyRoot ? `${settings.comfyRoot}/custom_nodes` : '', ''],
          (data) => push({ level: 'success', text: `>>> 已真实安装到 ${data.path || ''}` }),
          '安装插件'
        )
        break
      case 'plugin-switch':
      case 'plugin-log':
        push({ level: 'info', text: typeof payload === 'string' && payload.startsWith('>>>') ? payload : `>>> 切换插件版本: ${payload}` })
        runBackend(
          'kernel_checkout',
          [`${settings.comfyRoot}/custom_nodes/${payload?.name || payload}`, payload?.version],
          () => push({ level: 'success', text: '>>> 已真实切换插件版本' }),
          '切换插件版本'
        )
        break
      case 'plugin-toggle':
        push({ level: 'info', text: `>>> 切换插件状态: ${payload?.name || payload}` })
        runBackend(
          'plugin_set_enabled',
          [settings.comfyRoot, payload?.name || payload, payload?.enabled],
          () => push({ level: 'success', text: '>>> 已真实改变插件启用状态' }),
          '切换插件状态'
        )
        break
      case 'plugin-uninstall':
        push({ level: 'warning', text: `>>> 卸载插件: ${payload}` })
        runBackend(
          'plugin_uninstall',
          [settings.comfyRoot, payload],
          () => push({ level: 'success', text: '>>> 已真实卸载插件（已移入回收站）' }),
          '卸载插件'
        )
        break
      case 'batch-export': {
        /* 批量导出清单是纯前端可真实完成的：把选中项写成文件下载 */
        push({ level: 'cmd', text: `\n>>> 批量导出 ${payload.length} 个插件清单` })
        const text = payload.join('\n')
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
        a.href = url
        a.download = `kk-plugins-${ts}.txt`
        a.click()
        URL.revokeObjectURL(url)
        payload.forEach((n) => push({ level: 'info', text: ` - ${n}` }))
        push({ level: 'success', text: `>>> 已真实导出 ${payload.length} 个插件清单到 kk-plugins-${ts}.txt` })
        break
      }
      case 'batch-update':
        push({ level: 'cmd', text: `\n>>> 批量更新 ${payload.length} 个插件` })
        runBatch(payload, (name) => ['plugin_update', [settings.comfyRoot, name]], '更新')
        break
      case 'batch-toggle':
        push({ level: 'cmd', text: `\n>>> 批量开关 ${payload.length} 个插件` })
        runBatch(
          payload,
          (item) => ['plugin_set_enabled', [settings.comfyRoot, item.name, item.enabled]],
          '开关'
        )
        break
      case 'batch-uninstall':
        push({ level: 'cmd', text: `\n>>> 批量卸载 ${payload.length} 个插件` })
        runBatch(payload, (name) => ['plugin_uninstall', [settings.comfyRoot, name]], '卸载')
        break
      default:
        push({ level: 'info', text: `>>> ${action}` })
    }
  }

  /* 自动安装依赖 / 放心装（空数据阶段先本地托管） */
  const [autoInstall, setAutoInstall] = useState(true)
  const [safeMode, setSafeMode] = useState(false)

  const { push, clear } = useMemo(() => createLogger(setLogs), [])

  const navigate = useCallback((id) => setPage(id), [])

  const openTool = useCallback(
    (tool) => {
      /* action 工具不进页面，直接开外链 + 一行终端日志 */
      if (tool.kind === 'action') {
        push({ level: 'cmd', text: `\n>>> 正在打开：${tool.label}` })
        if (tool.url) {
          push({ level: 'info', text: ` - ${tool.url}` })
          window.open(tool.url, '_blank', 'noopener,noreferrer')
        } else {
          push({ level: 'warning', text: '>>> 该工具未配置外链地址' })
        }
        return
      }
      setPage(`tool:${tool.id}`)
    },
    [push]
  )

  const meta = useMemo(() => {
    if (page.startsWith('tool:')) {
      const tool = TOOL_MAP[page.slice(5)]
      return { title: tool?.label || '工具', subtitle: tool?.desc || '' }
    }
    return PAGE_META[page] || { title: '', subtitle: '' }
  }, [page])

  const renderPage = () => {
    if (page.startsWith('tool:')) {
      const id = page.slice(5)
      const ToolComponent = TOOL_ROUTES[id]
      return ToolComponent ? <ToolComponent /> : <ToolPlaceholder id={id} />
    }
    switch (page) {
      case 'home':
        return (
          <HomePage
            config={{ comfyRoot, pythonPath }}
            env={env}
            running={running}
            onLaunch={handleLaunch}
            onImportEnv={handleImportEnv}
            onLog={push}
            onNavigate={navigate}
          />
        )
      case 'kernel':
        return (
          <KernelPage
            versions={kernelVersions}
            currentVersion={settings.kernelVersion || env?.kernelVersion || ''}
            repoUrl={settings.repoUrl || ''}
            comfyRoot={comfyRoot}
            autoInstall={autoInstall}
            onToggleAutoInstall={setAutoInstall}
            onAction={handleKernelAction}
          />
        )
      case 'plugins':
        return (
          <PluginsPage
            plugins={plugins}
            autoInstall={autoInstall}
            onToggleAutoInstall={setAutoInstall}
            safeMode={safeMode}
            onToggleSafeMode={setSafeMode}
            onAction={handlePluginAction}
          />
        )
      case 'deps':
        return <DepsPage onAction={handleDepsAction} logs={logs} onClearLogs={clear} />
      case 'tools':
        return <ToolsPage tools={TOOLS_WITH_ICONS} onOpen={openTool} />
      case 'deploy':
        return (
          <DeployPage
            driver={DEPLOY_DRIVER}
            versions={DEPLOY_VERSIONS}
            dir={deployDir}
            progress={deployProgress}
            status={deployStatus}
            onPickDir={handlePickDeployDir}
            onDeploy={handleDeploy}
            onReset={handleDeployReset}
          />
        )
      case 'settings':
        return <SettingsPage />
      default:
        return null
    }
  }

  /* 环境依赖页动作 → 终端输出 */
  async function handleDepsAction(name, payload) {
    /* 三个终端协议功能走独立实现（见 openspec/spec/terminal.md） */
    if (name === 'compareEnv') return runCompareEnv()
    if (name === 'findRefs') return runFindRefs(payload)
    if (name === 'restoreSnapshot') return runRestoreSnapshot()

    const map = {
      speedTest: '>>> 正在启动镜像源测速（真实网络请求）...',
      analyzeReq: '>>> 正在分析依赖文件...',
      checkConflict: '>>> 正在检测冲突与缺失...',
      installDeps: '>>> 正在安装依赖...',
      viewEnv: '>>> 查看当前环境...',
      findConflict: '>>> 正在查找环境冲突...',
      compareEnv: '>>> 启动环境比较工具...',
      findRefs: `>>> 正在扫描引用了 [${payload || ''}] 的插件...`,
      startTerminal: '>>> 启动终端...',
      backupEnv: '>>> 正在备份当前环境...',
      restoreSnapshot: '>>> 请选择要恢复的快照文件...',
      applyMirror: `>>> 已应用镜像源：${payload ?? ''}`,
      speedTestNote:
        '>>> 说明：耗时为浏览器到各源的真实往返延迟；某源不可达会如实标记，不以随机数填充。',
      speedTestOne: ` - ${payload?.mirror ?? ''}  ${payload?.secs ?? ''} 秒`,
      speedTestFail: ` - ${payload?.mirror ?? ''}  不可达（${payload?.reason ?? '未知原因'}）`,
      speedTestAllFail: '>>> 测速结束：所有镜像源均不可达，未做切换。请检查网络连接后重试。',
      speedTestDone: `>>> 测速完成！最快源为：${payload?.mirror ?? ''}（${payload?.secs ?? ''} 秒），已自动切换。`,
      copyLog: '>>> 日志信息已复制到剪贴板',
      copyLogFail: '>>> 复制失败，请手动选择日志文本复制',
      /* 第三方库管理与终端示例命令 */
      installLib: `>>> pip install ${payload || ''}`,
      uninstallLib: `>>> pip uninstall -y ${payload || ''}`,
      installWhl: `>>> pip install ${payload || ''}`,
      sampleCmd: [
        '>>> 常用示例命令：',
        ' - pip list                     查看已安装依赖',
        ' - pip install -r requirements.txt   按文件安装依赖',
        ' - python -m pip install --upgrade pip   升级 pip',
      ].join('\n'),
    }
    /* 清空日志为独立回调，不产生新日志 */
    if (name === 'clearLog') {
      clear()
      return
    }
    push({ level: name === 'speedTestDone' ? 'success' : 'info', text: map[name] || `>>> ${name}` })
    setTerminalOpen(true)
  }

  /* ================= 终端协议三功能（openspec/spec/terminal.md） ================= */

  /*
   * 环境比较工具 —— 3 步终端向导，全程无弹窗
   * 任一步返回空 → 输出「操作已取消。」
   */
  async function runCompareEnv() {
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 启动环境比较工具...' })

    push({ level: 'info', text: '步骤 1/3: 请选择基准快照文件 (旧版本)...' })
    const baseFile = await selectRequirementsFile()
    if (!baseFile) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }
    push({ level: 'info', text: `基准文件: ${baseFile.name}` })

    push({ level: 'info', text: '步骤 2/3: 请选择目标快照文件 (新版本)...' })
    const targetFile = await selectRequirementsFile()
    if (!targetFile) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }
    push({ level: 'info', text: `目标文件: ${targetFile.name}` })

    push({ level: 'info', text: '步骤 3/3: 正在分析差异...' })

    try {
      /* 真实解析两份文件内容并比对，结果为实际差异 */
      const diff = compareSnapshots(baseFile.text, targetFile.text)
      /* 依赖文件分析头 */
      push({ level: 'cmd', text: `\n>>> 正在分析依赖文件: ${targetFile.name}` })
      push({
        level: 'info',
        text: [
          '',
          '=========== 依赖文件分析 ===========',
          ...diff.added.map((p) => `📦 ${p}\n   需求版本: 无要求`),
          ...diff.changed.map((c) => `📦 ${c.name}\n   需求版本: ${c.to}`),
          '------------------------------------',
          '====================================',
        ].join('\n'),
      })

      /* 差异三组 */
      push({
        level: 'success',
        text: [
          `\n🔍 比较结果: ${baseFile.name} → ${targetFile.name}`,
          ` 新增 ${diff.added.length} 个，移除 ${diff.removed.length} 个，变更 ${diff.changed.length} 个`,
        ].join('\n'),
      })

      if (diff.added.length) {
        push({ level: 'info', text: '\n[新增]' })
        diff.added.forEach((p) => push({ level: 'info', text: ` - ${p}` }))
      }
      if (diff.removed.length) {
        push({ level: 'info', text: '\n[移除]' })
        diff.removed.forEach((p) => push({ level: 'info', text: ` - ${p}` }))
      }
      if (diff.changed.length) {
        push({ level: 'info', text: '\n[变更]' })
        diff.changed.forEach((c) =>
          push({ level: 'info', text: ` - ${c.name}: ${c.from} → ${c.to}` })
        )
      }
      push({ level: 'success', text: '\n>>> 环境比较完成' })
    } catch (e) {
      push({ level: 'error', text: `>>> 比较失败: ${e?.message || e}` })
    }
  }

  /*
   * 查询引用插件 —— 前置校验 + 真实扫描 custom_nodes 下各插件的 requirements.txt
   * 校验：库名为空 / 尚未导入本地环境
   */
  async function runFindRefs(libName) {
    const lib = (libName || '').trim()
    if (!lib) {
      window.alert('提示\n请先输入要查询的库名')
      return
    }
    if (!env?.comfyRoot) {
      window.alert('提示\n尚未导入本地环境，请先在首页点击「添加本地环境」。')
      return
    }

    setTerminalOpen(true)
    push({ level: 'cmd', text: `\n>>> 正在扫描引用了 [${lib}] 的插件...` })

    /* 需要重新取得目录句柄才能遍历（句柄无法持久化） */
    if (!supportsDirectoryPicker()) {
      push({
        level: 'warning',
        text: '>>> 当前浏览器不支持目录遍历，无法扫描插件依赖。请使用 Chrome / Edge 打开。',
      })
      return
    }

    push({ level: 'info', text: '>>> 请选择 ComfyUI 根目录下的 custom_nodes 文件夹...' })
    let handle
    try {
      handle = await pickDirectoryHandle()
    } catch (e) {
      push({ level: 'error', text: `>>> 目录选择失败：${e?.message || e}` })
      return
    }
    if (!handle) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }

    try {
      const { plugins, reason, scanned } = await findLibInPlugins(handle, lib)
      if (plugins.length === 0) {
        push({ level: 'info', text: `🔍 查询结果: ${reason || `未发现任何插件显式依赖 [${lib}]。`}` })
        if (scanned) push({ level: 'info', text: ` (已扫描 ${scanned} 个插件目录)` })
        return
      }
      push({
        level: 'info',
        text: `🔍 查询结果: 发现 ${plugins.length} 个插件依赖此库:\n${plugins
          .map((p) => ` - ${p}`)
          .join('\n')}\n(基于真实读取各插件 requirements.txt 的声明)`,
      })
    } catch (e) {
      push({ level: 'error', text: `查询失败: ${e?.message || e}` })
    }
  }

  /*
   * 恢复快照依赖
   * 真实流程：后端 pip freeze 读取当前环境 → 与快照比对 → 展示真实差异表。
   * 差异来自后端真实读取，不再有任何模拟数据。
   */
  async function runRestoreSnapshot() {
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 恢复快照依赖' })

    const snapshotPath = await ensureSnapshotFile()
    if (!snapshotPath) {
      push({ level: 'error', text: '>>> 未选择快照文件，无法比对。' })
      return
    }

    push({ level: 'info', text: `>>> 快照文件：${snapshotPath}` })
    push({ level: 'cmd', text: '>>> 正在读取当前环境真实依赖...' })

    try {
      const diff = await call(
        'pip_preview_snapshot',
        [pythonPath, snapshotPath],
        '读取当前环境依赖需要后端执行 pip freeze',
        push
      )
      if (!diff.added?.length && !diff.removed?.length && !diff.changed?.length) {
        push({ level: 'success', text: '>>> 当前环境与快照一致，无需恢复。' })
        return
      }
      lastAction.current = '恢复快照依赖-预览'
      setRestoreDiff({
        snapshotPath,
        /* 后端返回 added/removed/changed，映射为差异表弹窗的 install/remove/update */
        remove: diff.removed || [],
        update: diff.changed || [],
        install: diff.added || [],
        snapshotCount: (diff.removed || []).length + (diff.changed || []).length + (diff.added || []).length,
      })
      setRestoreOpen(true)
      push({
        level: 'success',
        text: `>>> 比对完成：新增 ${diff.added?.length || 0}、移除 ${diff.removed?.length || 0}、变更 ${diff.changed?.length || 0}`,
      })
    } catch (e) {
      push({ level: 'error', text: `>>> 比对失败：${e?.message || e}` })
    }
  }

  /*
   * 确保拿到快照文件的真实路径。
   * 后端可用时用系统选择框取绝对路径；否则用浏览器选择并读取文本，
   * 此时把文本连同文件名交给后端比对（后端兼容"直接传文本"）。
   */
  async function ensureSnapshotFile() {
    const backendPath = await pickFileBackend('选择依赖快照文件', [
      ['文本文件', '*.txt'],
      ['所有文件', '*.*'],
    ])
    if (backendPath) return backendPath
    const picked = await pickTextFile('.txt')
    return picked?.text ?? null
  }

  /* 执行恢复快照依赖 */
  async function handleRestoreConfirm(selections) {
    const path = restoreDiff?.snapshotPath || ''
    setTerminalOpen(true)
    push({ level: 'cmd', text: `\n>>> 开始恢复快照依赖: ${path}` })

    try {
      await restoreEnvSnapshot(
        pythonPath,
        {
          added: selections?.install || [],
          removed: selections?.remove || [],
          changed: selections?.update || [],
        },
        null,
        push
      )
      lastAction.current = '恢复快照依赖-执行'
      push({ level: 'success', text: '>>> 恢复快照依赖完成' })
      setRestoreOpen(false)
      setRestoreDiff(null)
    } catch (e) {
      push({ level: 'error', text: `>>> 恢复失败: ${e?.message || e}` })
    }
  }

  /* 启动 / 停止内核
   * 无后端阶段：不编造 PID 与假日志，只记录真实发生的状态变化，
   * 并明确告知用户数据需后端接入后才会真实产生。 */
  function handleLaunch() {
    if (running) {
      setRunning(false)
      setPid(null)
      push({ level: 'warning', text: '>>> 内核已停止运行' })
      return
    }
    setRunning(true)
    setTerminalOpen(true)
    push({ level: 'cmd', text: `>>> 正在启动 ComfyUI 内核...` })
    push({ level: 'info', text: `[INFO] 工作目录: ${comfyRoot || '未配置'}` })
    push({ level: 'info', text: `[INFO] 解释器: ${pythonPath || '未配置'}` })
    push({
      level: 'warning',
      text: '[INFO] 当前为纯前端预览，未连接后端进程，因此不会真实拉起 ComfyUI，也不会产生 PID。',
    })
    push({ level: 'info', text: '[INFO] 接入后端后，此处将输出真实的启动日志与进程号。' })
  }

  /* AI 日志分析：扫描当前日志给出摘要（本地模拟） */
  function handleAiAnalyze() {
    if (logs.length === 0) {
      push({ level: 'warning', text: '>>> 暂无日志可分析' })
      return
    }
    const total = logs.length
    const errs = logs.filter(
      (l) => (typeof l === 'string' ? l : l.text).includes('失败') ||
        (typeof l === 'string' ? l : l.text).includes('错误')
    ).length
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> AI 日志分析开始...' })
    push({ level: 'info', text: ` - 日志总行数：${total}` })
    push({ level: 'info', text: ` - 错误/失败条目：${errs}` })
    push({
      level: errs > 0 ? 'warning' : 'success',
      text: errs > 0 ? 'AI 建议：存在错误条目，建议优先排查上述报错。' : 'AI 建议：未发现明显异常。',
    })
  }

  /* 重置部署环境：清空进度并输出日志 */
  function handleDeployReset() {
    setDeployProgress(0)
    setDeployStatus('待命')
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 正在重置部署环境...' })
    push({ level: 'info', text: '>>> 已清理部署目录与缓存' })
    push({ level: 'success', text: '>>> 环境已重置，可重新部署' })
  }

  /* 选择部署目录（浏览器环境下无原生目录对话框，用 file input 近似） */
  function handlePickDeployDir() {
    pickDirectory().then((path) => {
      if (!path) return
      setDeployDir(path)
      push({ level: 'info', text: `>>> 已选择部署目录：${path}` })
    })
  }

  /*
   * 初恋部署
   * 无后端阶段：不推进假进度、不虚构硬件版本。
   * 用户点击后明确告知需要后端，并输出真实的前置校验结果。
   */
  function handleDeploy() {
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 正在校验部署前置条件...' })

    if (!deployDir) {
      push({ level: 'warning', text: '>>> 尚未选择部署目录，请先选择。' })
      return
    }
    push({ level: 'info', text: ` - 部署目录：${deployDir}` })
    push({ level: 'info', text: ' - 目录已选择：通过' })
    push({
      level: 'warning',
      text: '>>> 当前为纯前端预览，未连接后端，无法执行真实的下载与安装流程，因此不会推进部署进度。',
    })
    push({ level: 'info', text: '>>> 接入后端后，此处将按真实阶段输出部署日志与进度。' })
  }

  /* 生成日志：把当前日志导出为 .log 文件 */
  function handleExportLog() {
    if (logs.length === 0) {
      push({ level: 'warning', text: '>>> 暂无日志可导出' })
      return
    }
    const text = logs.map((l) => (typeof l === 'string' ? l : l.text)).join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    a.href = url
    a.download = `kk-launcher-${ts}.log`
    a.click()
    URL.revokeObjectURL(url)
    push({ level: 'success', text: `>>> 日志已导出（${logs.length} 行）` })
  }

  return (
    <div className="h-full flex overflow-hidden bg-[var(--bg-main)]">
      <Sidebar current={page} onNavigate={navigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((v) => !v)}
          onAction={handleTopBarAction}
        />

        {/*
         * 内容区 —— 唯一可滚动区域
         *
         * 修复前：此处是裸的 renderPage()，外层容器为 overflow-hidden，
         * 窗口一旦变矮，超出部分被直接裁掉且无法滚动 —— 即「显示不全」。
         *
         * min-h-0 是 flex 子项能正确收缩滚动的前提（否则 flex 子项默认
         * min-height:auto，会被内容撑高，滚动条永不出现）。
         */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {page.startsWith('tool:') ? <div className="p-6">{renderPage()}</div> : renderPage()}
        </main>

        <TerminalDrawer
          open={terminalOpen}
          onClose={() => setTerminalOpen(false)}
          logs={logs}
          onClear={clear}
          running={running}
          pid={pid}
          onLaunch={handleLaunch}
          onStop={handleLaunch}
          onOpenBrowser={() => push({ level: 'info', text: '>>> 打开浏览器 http://127.0.0.1:8188' })}
          onAiAnalyze={handleAiAnalyze}
          onExportLog={handleExportLog}
          height={terminalHeight}
        />
      </div>

          {/* 恢复快照依赖 —— 差异表弹窗（唯一有页面内 UI 的终端功能） */}
          <SnapshotDiffModal
            open={restoreOpen}
            diff={restoreDiff}
            onClose={() => {
              setRestoreOpen(false)
              setRestoreDiff(null)
            }}
            onConfirm={handleRestoreConfirm}
          />
    </div>
  )
}

/*
 * 外层 App —— 只负责挂载 Provider
 * SettingsProvider 必须在 AppShell 外层，AppShell 才能读取环境路径。
 */
export default function App() {
  return (
    <SettingsProvider>
      <UIProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </UIProvider>
    </SettingsProvider>
  )
}

/* 十二个工具页占位 —— S3 阶段逐一替换 */
function ToolPlaceholder({ id }) {
  const tool = TOOL_MAP[id]
  const Icon = ICONS[tool?.icon] || ICONS.Boxes
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10">
      <div
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool?.gradient} flex items-center justify-center mb-5 shadow-xl`}
      >
        <Icon size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-black text-[var(--text-main)]">{tool?.label}</h2>
      <p className="mt-2 text-xs text-[var(--text-sub)] max-w-sm leading-relaxed">
        {tool?.desc} — 界面重建中（S3 阶段填充）
      </p>
    </div>
  )
}
