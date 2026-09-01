/*
 * 后端调用适配层
 *
 * 依据 openspec/spec/terminal.md 的调用契约。
 *
 * 数据真实性约定（重要）：
 *   本文件不再返回任何预置的模拟数据。凡是无法在纯前端真实计算出来的
 *   结果，一律返回空集合（而非编造示例），由调用方展示「未获取到」。
 *
 *   可以在前端真实完成的功能：
 *     - 解析用户选择的 requirements.txt，做依赖比对、差异计算
 *     - 在用户选择的 ComfyUI 目录内，扫描插件的 requirements.txt 引用关系
 *
 *   必须由后端完成、前端无法伪造的功能：
 *     - 快照恢复的执行（需要 pip）
 *     - 版本号、GPU 显存等运行时信息
 *   这些函数会抛出「需要后端」的明确错误，而不是假装成功。
 */

import { pickTextFile } from './picker'

/* ================= 依赖文件解析（纯前端可真实完成） ================= */

/*
 * 解析 requirements.txt 文本为 {name → spec} 映射
 * 支持：pkg==1.0.0 / pkg>=1.0 / pkg~=1.0 / pkg @ url / 纯包名 / 注释 / -r 嵌套忽略
 */
export function parseRequirements(text) {
  const map = new Map()
  if (!text) return map

  text.split(/\r?\n/).forEach((raw) => {
    let line = raw.trim()
    if (!line || line.startsWith('#')) return
    /* 去掉行内注释 */
    line = line.split(' #')[0].trim()
    if (!line || line.startsWith('-')) return

    /* 形如  pkg==1.2.3  /  pkg>=1.0  /  pkg~=2.0  /  pkg!=1.0 */
    const m = line.match(/^([A-Za-z0-9_.\-]+)\s*(==|>=|<=|~=|!=|>|<)?\s*(.*)$/)
    if (!m) return
    const name = m[1].toLowerCase()
    const spec = m[3] ? m[3].trim() : ''
    map.set(name, spec)
  })
  return map
}

/* ================= 文件选择：复用统一的 picker ================= */

/* 选择 requirements 文件，返回 { name, text }（取消返回 null） */
export async function selectRequirementsFile() {
  return pickTextFile('.txt')
}

/* ================= 环境比较（真实计算） ================= */

/*
 * 比较两份依赖文件，返回差异三组
 * base / target 为 requirements.txt 的文本内容
 * 计算完全在前端完成，结果是真实的。
 */
export function compareSnapshots(baseText, targetText) {
  const base = parseRequirements(baseText || '')
  const target = parseRequirements(targetText || '')

  const added = []
  const removed = []
  const changed = []

  target.forEach((spec, name) => {
    if (!base.has(name)) {
      added.push(spec ? `${name}==${spec}` : name)
    } else if (base.get(name) !== spec) {
      changed.push({ name, from: base.get(name) || '未指定', to: spec || '未指定' })
    }
  })

  base.forEach((spec, name) => {
    if (!target.has(name)) {
      removed.push(spec ? `${name}==${spec}` : name)
    }
  })

  const sortStr = (a, b) => a.localeCompare(b)
  return {
    added: added.sort(sortStr),
    removed: removed.sort(sortStr),
    changed: changed.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/* ================= 查询引用插件（真实扫描） ================= */

/*
 * 在用户选择的 ComfyUI 目录内，扫描各插件的 requirements.txt，
 * 找出声明依赖了指定库的插件。
 *
 * pluginsDirHandle 为 custom_nodes 的目录句柄（File System Access API）。
 * 没有真实目录句柄时无法扫描，返回空数组并标注原因——不编造结果。
 */
export async function findLibInPlugins(customNodesHandle, libName) {
  const lib = (libName || '').trim().toLowerCase()
  if (!lib) return { plugins: [], reason: '库名为空' }
  if (!customNodesHandle) {
    return { plugins: [], reason: '尚未选择 ComfyUI 目录，无法扫描插件依赖' }
  }

  const hits = []
  let scanned = 0

  for await (const [name, handle] of customNodesHandle.entries()) {
    if (handle.kind !== 'directory') continue
    scanned++
    try {
      const fh = await handle.getFileHandle('requirements.txt')
      const file = await fh.getFile()
      const text = await file.text()
      const deps = parseRequirements(text)
      if (deps.has(lib)) hits.push(name)
    } catch {
      /* 该插件没有 requirements.txt，跳过 */
    }
  }

  return {
    plugins: hits.sort(),
    reason: hits.length ? '' : `已扫描 ${scanned} 个插件，均未在其 requirements.txt 中声明 [${libName}]`,
    scanned,
  }
}

/* ================= 需要后端的函数（明确报错，不伪造结果） ================= */

const needBackend = (what) =>
  Promise.reject(new Error(`${what} 需要后端支持（需执行 pip / 读取运行时状态），当前为纯前端预览，无法完成，也未返回模拟结果。`))

/* 预览快照恢复差异 */
export function previewRestoreSnapshot() {
  return needBackend('快照恢复差异预览')
}

/* 执行快照恢复 */
export function restoreEnvSnapshot() {
  return needBackend('快照恢复')
}
