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

import { call } from './backend'

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

/* ================= 需要后端的函数（Eel 后端真实执行） ================= */

/*
 * 预览快照恢复差异
 *
 * 前端无法读取用户环境的真实依赖，必须交给后端 pip freeze 后比对。
 * 后端不可用时抛出明确错误，不返回模拟结果。
 */
export async function previewRestoreSnapshot(pythonPath, targetText, push) {
  return call(
    'pip_preview_snapshot',
    [pythonPath, targetText],
    '快照恢复差异预览需要后端读取当前环境的真实依赖',
    push
  )
}

/* 执行快照恢复：由后端按差异真实执行 pip 安装/卸载 */
export async function restoreEnvSnapshot(pythonPath, diff, indexUrl, push) {
  return call(
    'pip_restore_snapshot',
    [pythonPath, diff.added || [], diff.removed || [], diff.changed || [], indexUrl || null],
    '快照恢复需要后端执行 pip 安装/卸载',
    push
  )
}
