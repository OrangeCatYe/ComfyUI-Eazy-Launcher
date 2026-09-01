/*
 * 本地环境扫描器
 *
 * 职责：对用户选择的目录做真实扫描，识别出 ComfyUI 环境的真实信息，
 * 全程不产生任何虚构数据。读不到就返回 null / 空数组，由 UI 显示「未识别」。
 *
 * 目录选择用 File System Access API（showDirectoryPicker），
 * 该 API 在 file:// 下的支持因浏览器而异，因此做了降级：
 *   1. 首选 showDirectoryPicker —— 能拿到真实目录名与可遍历的句柄
 *   2. 不支持时降级为 <input webkitdirectory> —— 能拿到相对路径与文件列表
 * 两者最终都汇总成同一个 ScanResult 结构，上层无需区分。
 */

/* 判定为 ComfyUI 内核目录的关键标志 */
const COMFY_MARKERS = ['main.py', 'nodes.py', 'execution.py', 'comfy', 'custom_nodes']

/*
 * 扫描深度：ComfyUI 整合包常见两层嵌套
 *   外层（整合包）→ ComfyUI/ → 真正的内核目录
 * 这里向下找 3 层，命中即停。
 */
const MAX_DEPTH = 3

/* 扫描结果结构（字段全部可空，代表「未识别」） */
export function emptyScan() {
  return {
    ok: false,
    mode: null, // 'picker' | 'input'
    rootName: '', // 用户选中的目录名
    comfyRoot: '', // 识别出的 ComfyUI 内核目录完整路径
    nested: false, // 是否发生了下钻
    pythonPath: '', // 识别出的 python.exe 路径
    pythonSource: '', // venv / standalone / system / ''
    hasGit: false,
    pluginCount: 0,
    plugins: [],
    requirements: null, // requirements.txt 内容（原文）
    modelsDirs: [],
    reason: '', // 未识别时给用户看的原因
  }
}

/* ============ 入口：让用户选目录并扫描 ============ */
export async function scanEnvironmentFromPicker() {
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' })
      const result = await walkHandle(handle)
      result.mode = 'picker'
      return result
    } catch (err) {
      /* 用户主动取消：AbortError，直接返回 null 由上层静默处理 */
      if (err && err.name === 'AbortError') return null
      /* 其余错误（如 file:// 下被拦截）降级到 input 方式 */
      return scanFromInput()
    }
  }
  return scanFromInput()
}

/* ============ 降级方案：<input webkitdirectory> ============ */
function scanFromInput() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.directory = true
    input.multiple = true

    let settled = false
    const finish = (val) => {
      if (settled) return
      settled = true
      resolve(val)
    }

    input.onchange = () => {
      const files = Array.from(input.files || [])
      if (files.length === 0) return finish(null)
      finish(analyzeFileList(files))
    }

    /* 用户取消时 change 不触发，用窗口重新获得焦点兜底 */
    window.addEventListener('focus', () => setTimeout(() => finish(null), 800), { once: true })
    input.click()
  })
}

/*
 * 从 FileList 还原目录结构并分析
 * webkitRelativePath 形如：ComfyUI/ComfyUI/custom_nodes/Foo/bar.py
 * 只能拿到用户选中的目录下所有文件，无法得知绝对路径的盘符部分，
 * 因此这里记录「相对结构」，绝对路径只在 picker 模式下可得。
 */
function analyzeFileList(files) {
  const result = emptyScan()
  result.mode = 'input'

  const paths = files.map((f) => f.webkitRelativePath || f.name)
  result.rootName = paths[0] ? paths[0].split('/')[0] : ''

  /* 找到包含最多 ComfyUI 标志的那一层，作为内核目录 */
  const scores = new Map()
  paths.forEach((p) => {
    const segs = p.split('/')
    /* 只需看目录层级，最后一段是文件名 */
    for (let i = 0; i < segs.length - 1; i++) {
      const dir = segs.slice(0, i + 1).join('/')
      if (!scores.has(dir)) scores.set(dir, { files: new Set(), dirs: new Set() })
      const s = scores.get(dir)
      s.files.add(segs[segs.length - 1])
      if (i + 1 < segs.length - 1) s.dirs.add(segs[i + 1])
    }
  })

  let bestDir = null
  let bestScore = 0
  scores.forEach((s, dir) => {
    const score = COMFY_MARKERS.filter((m) => s.files.has(m) || s.dirs.has(m)).length
    if (score > bestScore) {
      bestScore = score
      bestDir = dir
    }
  })

  /* 至少要命中 3 个标志才认为是 ComfyUI 内核目录 */
  if (!bestDir || bestScore < 3) {
    result.reason = '未在该目录中识别到 ComfyUI 内核特征（main.py / nodes.py / custom_nodes 等）'
    return result
  }

  const s = scores.get(bestDir)
  result.ok = true
  result.comfyRoot = bestDir
  result.nested = bestDir.includes('/')
  result.hasGit = [...s.dirs].includes('.git')

  /* 插件：custom_nodes 下的直接子目录（排除 __pycache__ 等） */
  const plugins = new Set()
  paths.forEach((p) => {
    const prefix = `${bestDir}/custom_nodes/`
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length)
      const name = rest.split('/')[0]
      if (name && !name.startsWith('__') && !name.startsWith('.')) plugins.add(name)
    }
  })
  result.plugins = [...plugins].sort()
  result.pluginCount = result.plugins.length

  /* models 下的直接子目录（分类文件夹） */
  const models = new Set()
  paths.forEach((p) => {
    const prefix = `${bestDir}/models/`
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length)
      const name = rest.split('/')[0]
      if (name && !name.startsWith('.')) models.add(name)
    }
  })
  result.modelsDirs = [...models].sort()

  /* Python：优先 .venv，其次 python.exe 同级，最后向上找 standalone */
  const allFiles = new Set(paths.map((p) => p))
  const venvPy = `${bestDir}/.venv/Scripts/python.exe`
  const venvPyUnix = `${bestDir}/.venv/bin/python`
  if (allFiles.has(venvPy)) {
    result.pythonPath = venvPy
    result.pythonSource = 'venv'
  } else if (allFiles.has(venvPyUnix)) {
    result.pythonPath = venvPyUnix
    result.pythonSource = 'venv'
  } else {
    /* 向上层找 standalone-env / python_embeded 之类的独立环境 */
    const segs = bestDir.split('/')
    outer: for (let i = segs.length - 1; i >= 0; i--) {
      const base = segs.slice(0, i).join('/')
      for (const cand of ['standalone-env/python.exe', 'python_embeded/python.exe', 'python.exe']) {
        const full = base ? `${base}/${cand}` : cand
        if (allFiles.has(full)) {
          result.pythonPath = full
          result.pythonSource = cand.startsWith('standalone') ? 'standalone' : 'embedded'
          break outer
        }
      }
    }
  }

  return result
}

/* ============ 主方案：遍历 FileSystemDirectoryHandle ============ */
async function walkHandle(rootHandle) {
  const result = emptyScan()
  result.rootName = rootHandle.name

  /* 收集到 MAX_DEPTH 层的目录快照 */
  const tree = new Map() // 路径 → { files:Set, dirs:Set }
  tree.set('', { files: new Set(), dirs: new Set() })

  const walk = async (dirHandle, path, depth) => {
    if (depth > MAX_DEPTH) return
    if (!tree.has(path)) tree.set(path, { files: new Set(), dirs: new Set() })
    const node = tree.get(path)

    for await (const [name, h] of dirHandle.entries()) {
      if (h.kind === 'directory') {
        node.dirs.add(name)
        /* 跳过体积巨大且与识别无关的目录，避免遍历过久 */
        if (['node_modules', '.git', '__pycache__', 'output', 'temp', 'input'].includes(name)) {
          /* 仍记录存在，但不深入 */
          continue
        }
        await walk(h, path ? `${path}/${name}` : name, depth + 1)
      } else {
        node.files.add(name)
      }
    }
  }

  try {
    await walk(rootHandle, '', 0)
  } catch (e) {
    result.reason = `目录读取失败：${e?.message || e}`
    return result
  }

  /* 打分选出内核目录 */
  let bestDir = ''
  let bestScore = 0
  tree.forEach((node, dir) => {
    const score = COMFY_MARKERS.filter((m) => node.files.has(m) || node.dirs.has(m)).length
    if (score > bestScore) {
      bestScore = score
      bestDir = dir
    }
  })

  if (bestScore < 3) {
    result.reason = '未在该目录中识别到 ComfyUI 内核特征（main.py / nodes.py / custom_nodes 等）'
    return result
  }

  const node = tree.get(bestDir)
  result.ok = true
  /* picker 模式下可以拼出真实绝对路径 */
  result.comfyRoot = joinRoot(rootHandle.name, bestDir)
  result.nested = bestDir !== ''
  result.hasGit = node.dirs.has('.git')

  /* 插件目录名 */
  const cnPath = bestDir ? `${bestDir}/custom_nodes` : 'custom_nodes'
  const cn = tree.get(cnPath)
  if (cn) {
    result.plugins = [...cn.dirs]
      .filter((n) => !n.startsWith('__') && !n.startsWith('.'))
      .sort()
    result.pluginCount = result.plugins.length
  }

  /* models 分类目录 */
  const mdPath = bestDir ? `${bestDir}/models` : 'models'
  const md = tree.get(mdPath)
  if (md) {
    result.modelsDirs = [...md.dirs].filter((n) => !n.startsWith('.')).sort()
  }

  /* Python 解释器 */
  if (node.dirs.has('.venv')) {
    result.pythonPath = joinRoot(rootHandle.name, bestDir ? `${bestDir}/.venv/Scripts/python.exe` : '.venv/Scripts/python.exe')
    result.pythonSource = 'venv'
  } else {
    const segs = bestDir ? bestDir.split('/') : []
    let found = false
    for (let i = segs.length; i >= 0 && !found; i--) {
      const base = segs.slice(0, i).join('/')
      for (const cand of [
        ['standalone-env/python.exe', 'standalone'],
        ['python_embeded/python.exe', 'embedded'],
        ['python.exe', 'system'],
      ]) {
        const rel = base ? `${base}/${cand[0]}` : cand[0]
        const t = tree.get(rel.replace(/\/python\.exe$/, '').replace(/\/python$/, ''))
        if (t && t.files.has(cand[0].split('/').pop())) {
          result.pythonPath = joinRoot(rootHandle.name, rel)
          result.pythonSource = cand[1]
          found = true
          break
        }
      }
    }
  }

  /* 读取 requirements.txt（真实内容，读不到则保持 null） */
  try {
    const target = bestDir ? bestDir.split('/').reduce((d, n) => d.then((x) => x.getDirectoryHandle(n)), Promise.resolve(rootHandle)) : Promise.resolve(rootHandle)
    const dir = await target
    const fh = await dir.getFileHandle('requirements.txt')
    const file = await fh.getFile()
    result.requirements = await file.text()
  } catch {
    result.requirements = null
  }

  return result
}

/* 把「用户选中的根目录名 + 相对路径」拼成可读的绝对路径展示串 */
function joinRoot(rootName, rel) {
  if (!rel) return rootName
  return `${rootName}/${rel}`
}

/* ================= 通用目录扫描（真实读取） ================= */

/* 常见模型文件后缀 */
const MODEL_EXTS = [
  '.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.gguf',
  '.onnx', '.torchscript', '.sft', '.fp16', '.pruned',
]

/*
 * 让用户选择模型目录并真实扫描
 * 返回 { ok, dir, models:[{name, size, ext}] }，取消返回 null
 */
export async function scanModelDirectory() {
  if (typeof window === 'undefined') return null
  if (typeof window.showDirectoryPicker !== 'function') {
    return { ok: false, dir: '', models: [], reason: '当前浏览器不支持目录选择，请使用 Chrome / Edge。' }
  }

  let handle
  try {
    handle = await window.showDirectoryPicker({ mode: 'read' })
  } catch (err) {
    if (err && err.name === 'AbortError') return null
    return { ok: false, dir: '', models: [], reason: `目录选择失败：${err?.message || err}` }
  }

  const models = []
  try {
    for await (const [name, h] of handle.entries()) {
      if (h.kind !== 'file') continue
      const lower = name.toLowerCase()
      if (!MODEL_EXTS.some((e) => lower.endsWith(e))) continue
      let size = 0
      try {
        const f = await h.getFile()
        size = f.size
      } catch {
        size = 0
      }
      models.push({
        name,
        size,
        ext: lower.slice(lower.lastIndexOf('.')),
      })
    }
  } catch (e) {
    return { ok: false, dir: handle.name, models: [], reason: `目录遍历失败：${e?.message || e}` }
  }

  models.sort((a, b) => a.name.localeCompare(b.name))
  return { ok: true, dir: handle.name, models }
}

/* 把字节数格式化为易读文本 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/* 供 UI 展示：把扫描结果整理成人类可读的几行摘要 */
export function summarizeScan(r) {
  if (!r) return []
  const lines = []
  lines.push(`扫描目录：${r.rootName || '—'}`)
  if (!r.ok) {
    lines.push(`识别结果：未识别 —— ${r.reason || '原因未知'}`)
    return lines
  }
  lines.push(`ComfyUI 根目录：${r.comfyRoot}${r.nested ? '（已自动下钻定位）' : ''}`)
  lines.push(
    r.pythonPath
      ? `Python 解释器：${r.pythonPath}（${{ venv: '虚拟环境', standalone: '独立运行环境', embedded: '嵌入式环境', system: '系统环境' }[r.pythonSource] || r.pythonSource}）`
      : 'Python 解释器：未找到'
  )
  lines.push(`已装插件：${r.pluginCount} 个${r.pluginCount ? `（${r.plugins.slice(0, 5).join('、')}${r.pluginCount > 5 ? ' 等' : ''}）` : ''}`)
  if (r.modelsDirs.length) lines.push(`模型分类目录：${r.modelsDirs.join('、')}`)
  lines.push(`Git 仓库：${r.hasGit ? '是' : '否'}`)
  return lines
}

/* ================= 通用目录文件扫描 ================= */

/*
 * 让用户选择一个目录，真实读取其中（含子目录）符合后缀的文件。
 * 服务于「我的作品」「工作流仓库」等需要列文件的工具页。
 *
 * exts 传空数组表示不限后缀，全部列出。
 * 返回 { ok, dir, files:[{name, path, size, ext}] }；取消返回 null。
 */
export async function scanFilesDirectory(exts = []) {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return { ok: false, dir: '', files: [], reason: '当前浏览器不支持目录选择，请使用 Chrome / Edge。' }
  }

  let handle
  try {
    handle = await window.showDirectoryPicker({ mode: 'read' })
  } catch (err) {
    if (err && err.name === 'AbortError') return null
    return { ok: false, dir: '', files: [], reason: `目录选择失败：${err?.message || err}` }
  }

  const files = []
  try {
    const walk = async (dir, prefix) => {
      for await (const [name, h] of dir.entries()) {
        if (h.kind === 'directory') {
          await walk(h, prefix ? `${prefix}/${name}` : name)
          continue
        }
        const lower = name.toLowerCase()
        if (exts.length && !exts.some((e) => lower.endsWith(String(e).toLowerCase()))) continue
        let size = 0
        try {
          size = (await h.getFile()).size
        } catch {
          size = 0
        }
        files.push({ name, path: prefix ? `${prefix}/${name}` : name, size })
      }
    }
    await walk(handle, '')
  } catch (e) {
    return { ok: false, dir: handle.name, files: [], reason: `目录遍历失败：${e?.message || e}` }
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  return { ok: true, dir: handle.name, files }
}

/* 常用媒体后缀：我的作品 */
export const MEDIA_EXTS = [
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp',
  '.mp4', '.webm', '.mov', '.avi',
]

/* 工作流后缀：工作流仓库 */
export const WORKFLOW_EXTS = ['.json', '.workflow.json']
