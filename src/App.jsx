import { useCallback, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { TerminalDrawer } from './components/layout/TerminalDrawer'
import { SnapshotDiffModal } from './components/ui/SnapshotDiffModal'
import { TOOLS, TOOL_MAP } from './config/navigation'
import * as ICONS from './lib/icons'
import { UIProvider } from './store/uiStore'
import { SettingsProvider, useSettings } from './store/settingsStore'
import { ToastProvider } from './components/ui/Toast'
import { pickDirectory, pickFile } from './lib/picker'
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

/* 初恋部署静态数据（截图实证：驱动 591.44 / RTX 4080 / Python 3.12 / Torch 2.10.0+cu128） */
const DEPLOY_DRIVER = {
  version: '591.44',
  gpu: 'NVIDIA GeForce RTX 4080',
  arch: 'ada',
}

const DEPLOY_VERSIONS = {
  python: '3.12',
  torch: '2.10.0+cu128',
}

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
const TOOLS_WITH_ICONS = TOOLS.map((t) => ({ ...t, icon: ICONS[t.icon] || ICONS.Boxes }))

function AppShell() {
  /* 环境路径取自统一设置层（全局设置 → 系统与网络配置 → 基础运行环境） */
  const { settings } = useSettings()
  const comfyRoot = settings.comfyRoot || ''
  const pythonPath = settings.pythonPrimary || ''

  const [page, setPage] = useState('home')
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [logs, setLogs] = useState([])
  /* 内核运行态：running 为真时终端显示「停止运行」与 PID */
  const [running, setRunning] = useState(false)
  const [pid, setPid] = useState(null)
  /* 初恋部署：进度与阶段状态 */
  const [deployProgress, setDeployProgress] = useState(0)
  const [deployStatus, setDeployStatus] = useState('待命')
  const [deployDir, setDeployDir] = useState('')

  /* 恢复快照依赖：差异表弹窗（terminal.md 4.1） */
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreDiff, setRestoreDiff] = useState(null)
  /* 动作标记：记录最后一次「恢复快照依赖」动作阶段 */
  const lastAction = useRef(null)

  /* ================= 顶栏图标按钮 → 终端日志 ================= */
  function handleTopBarAction(action, payload) {
    setTerminalOpen(true)
    switch (action) {
      case 'topbar-refresh':
        push({ level: 'cmd', text: '\n>>> 正在刷新页面数据...' })
        push({ level: 'success', text: '>>> 刷新完成' })
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
        push({ level: 'cmd', text: '\n>>> 正在从远程仓库拉取版本列表...' })
        push({ level: 'info', text: '>>> git fetch --tags' })
        push({ level: 'success', text: '>>> 版本列表已更新' })
        break
      case 'kernel-switch-repo':
        push({ level: 'cmd', text: `\n>>> 切换远程仓库: ${payload}` })
        push({ level: 'success', text: '>>> 仓库切换完成' })
        break
      case 'kernel-switch-version':
        push({ level: 'cmd', text: `\n>>> 正在切换内核版本: ${payload}` })
        push({ level: 'info', text: '>>> 正在拉取对应提交...' })
        push({ level: 'success', text: '>>> 内核切换完成' })
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
        push({ level: 'cmd', text: `\n>>> 正在安装插件: ${payload}` })
        push({ level: 'success', text: '>>> 插件安装完成' })
        break
      case 'plugin-switch':
      case 'plugin-log':
        push({ level: 'info', text: typeof payload === 'string' && payload.startsWith('>>>') ? payload : `>>> 正在切换插件版本: ${payload}` })
        push({ level: 'success', text: '>>> 切换完成' })
        break
      case 'plugin-toggle':
        push({ level: 'info', text: `>>> 正在切换插件状态: ${payload}` })
        push({ level: 'success', text: '>>> 状态切换完成' })
        break
      case 'plugin-uninstall':
        push({ level: 'warning', text: `>>> 正在卸载插件: ${payload}` })
        push({ level: 'success', text: '>>> 卸载完成' })
        break
      case 'batch-export':
        push({ level: 'cmd', text: `\n>>> 批量导出 ${payload.length} 个插件` })
        payload.forEach((n) => push({ level: 'info', text: ` - ${n}` }))
        push({ level: 'success', text: '>>> 批量导出完成' })
        break
      case 'batch-update':
        push({ level: 'cmd', text: `\n>>> 批量更新 ${payload.length} 个插件` })
        payload.forEach((n) => push({ level: 'info', text: `>>> 正在更新 ${n}...` }))
        push({ level: 'success', text: '>>> 批量更新完成' })
        break
      case 'batch-toggle':
        push({ level: 'cmd', text: `\n>>> 批量开关 ${payload.length} 个插件` })
        payload.forEach((n) => push({ level: 'info', text: ` - ${n}` }))
        push({ level: 'success', text: '>>> 批量开关完成' })
        break
      case 'batch-uninstall':
        push({ level: 'cmd', text: `\n>>> 批量卸载 ${payload.length} 个插件` })
        payload.forEach((n) => push({ level: 'warning', text: `>>> 正在卸载 ${n}...` }))
        push({ level: 'success', text: '>>> 批量卸载完成' })
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
            running={running}
            onLaunch={handleLaunch}
          />
        )
      case 'kernel':
        return (
          <KernelPage
            versions={[]}
            currentVersion="v0.33.1"
            repoUrl="https://github.com/Comfy-Org/ComfyUI.git"
            autoInstall={autoInstall}
            onToggleAutoInstall={setAutoInstall}
            onAction={handleKernelAction}
          />
        )
      case 'plugins':
        return (
          <PluginsPage
            plugins={[]}
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
      speedTest: '>>> 正在启动镜像源测速...',
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
      speedTestOne: ` - ${payload?.mirror ?? ''} (${payload?.secs ?? ''}秒)`,
      speedTestDone: `>>> 测速完成!检测到最快源为:${payload?.mirror ?? ''}(${payload?.secs ?? ''}秒)\n已自动切换。`,
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
    const base = await selectRequirementsFile()
    if (!base) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }
    push({ level: 'info', text: `基准文件: ${base}` })

    push({ level: 'info', text: '步骤 2/3: 请选择目标快照文件 (新版本)...' })
    const target = await selectRequirementsFile()
    if (!target) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }
    push({ level: 'info', text: `目标文件: ${target}` })

    push({ level: 'info', text: '步骤 3/3: 正在分析差异...' })

    try {
      const diff = await compareSnapshots(base, target)
      /* 依赖文件分析头 */
      push({ level: 'cmd', text: `\n>>> 正在分析依赖文件: ${target}` })
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
          `\n🔍 比较结果: ${base} → ${target}`,
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
   * 查询引用插件 —— 前置校验（唯一弹窗）+ 终端输出
   * 校验：库名为空 / ComfyUI 路径未设置
   */
  async function runFindRefs(libName) {
    const lib = (libName || '').trim()
    if (!lib) {
      window.alert('提示\n请先输入要查询的库名')
      return
    }
    if (!comfyRoot) {
      window.alert('提示\nComfyUI 路径未设置')
      return
    }

    setTerminalOpen(true)
    push({ level: 'cmd', text: `\n>>> 正在扫描引用了 [${lib}] 的插件...` })

    try {
      const plugins = await findLibInPlugins(comfyRoot, lib)
      if (plugins.length === 0) {
        push({
          level: 'info',
          text: `🔍 查询结果: 未发现任何插件显式依赖 [${lib}]。`,
        })
        return
      }
      push({
        level: 'info',
        text: `🔍 查询结果: 发现 ${plugins.length} 个插件依赖此库:\n${plugins
          .map((p) => ` - ${p}`)
          .join('\n')}\n(基于 requirements.txt 声明检测)`,
      })
    } catch (e) {
      push({ level: 'error', text: `查询失败: ${e?.message || e}` })
    }
  }

  /*
   * 恢复快照依赖 —— 页面内差异表 → 勾选 → 执行 → 终端日志
   * 唯一在页面内渲染差异表的功能
   */
  async function runRestoreSnapshot() {
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 请选择要恢复的快照文件...' })

    const snapshotPath = await selectRequirementsFile()
    if (!snapshotPath) {
      push({ level: 'warning', text: '操作已取消。' })
      return
    }
    push({ level: 'info', text: `快照文件: ${snapshotPath}` })
    push({ level: 'info', text: '>>> 正在预览恢复差异...' })

    try {
      const diff = await previewRestoreSnapshot(pythonPath, snapshotPath)
      lastAction.current = '恢复快照依赖-预览'
      setRestoreDiff({ ...diff, snapshotPath })
      setRestoreOpen(true)
      push({ level: 'success', text: '>>> 差异预览完成，请在弹窗中确认要恢复的条目。' })
    } catch (e) {
      push({ level: 'error', text: `>>> 预览失败: ${e?.message || e}` })
    }
  }

  /* 执行恢复快照依赖 */
  async function handleRestoreConfirm(selections) {
    const path = restoreDiff?.snapshotPath || ''
    setTerminalOpen(true)
    push({ level: 'cmd', text: `\n>>> 开始恢复快照依赖: ${path}` })

    try {
      await restoreEnvSnapshot(pythonPath, path, selections)
      lastAction.current = '恢复快照依赖-执行'
      push({ level: 'success', text: '>>> 恢复快照依赖完成' })
      setRestoreOpen(false)
      setRestoreDiff(null)
    } catch (e) {
      push({ level: 'error', text: `>>> 恢复失败: ${e?.message || e}` })
    }
  }

  /* 启动 / 停止内核（无后端阶段：本地模拟运行态与 PID） */
  function handleLaunch() {
    if (running) {
      setRunning(false)
      setPid(null)
      push({ level: 'warning', text: '>>> 内核已停止运行' })
      return
    }
    const fakePid = 1000 + Math.floor(Math.random() * 9000)
    setRunning(true)
    setPid(fakePid)
    setTerminalOpen(true)
    push({ level: 'cmd', text: '>>> 正在启动 ComfyUI 内核...' })
    push({ level: 'info', text: `[INFO] 进程已创建，PID: ${fakePid}` })
    setTimeout(() => {
      push({ level: 'info', text: '[INFO] Checkpoint files will always be loaded safely.' })
      push({ level: 'info', text: '[INFO] Total VRAM 16376 MB, total RAM 130701 MB' })
    }, 400)
    setTimeout(() => {
      push({ level: 'info', text: '[INFO] Device: cuda:0 NVIDIA GeForce RTX 4080 : cudaMallocAsync' })
      push({ level: 'success', text: '[INFO] ComfyUI 启动完成，可点击「打开浏览器」访问' })
    }, 900)
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

  /* 初恋部署：按阶段推进进度（无后端阶段本地模拟） */
  function handleDeploy() {
    if (deployProgress > 0 && deployProgress < 100) return

    const steps = [
      { at: 10, status: '创建部署目录', text: '>>> 正在创建部署目录...' },
      { at: 35, status: '下载 Python', text: '>>> 正在下载并解压 Python 运行环境...' },
      { at: 50, status: '创建虚拟环境', text: '>>> 正在创建虚拟环境...' },
      { at: 75, status: '安装 Pytorch', text: '>>> 正在安装 Pytorch+Cuda 套件（耗时较长）...' },
      { at: 90, status: '拉取仓库', text: '>>> 正在拉取 ComfyUI 仓库...' },
      { at: 100, status: '完成', text: '>>> 正在安装依赖并收尾...' },
    ]

    setDeployProgress(0)
    setDeployStatus(steps[0].status)
    setTerminalOpen(true)
    push({ level: 'cmd', text: '\n>>> 开始部署 ComfyUI 整合包...' })

    steps.forEach((s, i) => {
      setTimeout(() => {
        setDeployProgress(s.at)
        setDeployStatus(s.status)
        push({ level: 'info', text: s.text })
        if (i === steps.length - 1) {
          push({ level: 'success', text: '>>> 部署完成！可以启动内核了。' })
        }
      }, (i + 1) * 700)
    })
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

            {page.startsWith('tool:') ? (
              <div className="p-6">{renderPage()}</div>
            ) : (
              renderPage()
            )}

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
