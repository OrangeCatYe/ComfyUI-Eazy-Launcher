/*
 * 本地环境扫描器
 *
 * 本应用只以 Eel 桌面模式运行：目录选择与扫描一律由后端完成，
 * 拿到的是真实绝对路径与真实文件数据。
 * 无后端时由 backend.call 统一抛「未连接后端」错误，不做浏览器降级。
 */

import { call } from './backend'
import { pickDirectory } from './picker'

/* ============ 结构定义 ============ */

/* 扫描结果结构（字段全部可空，代表「未识别」） */
export function emptyScan() {
  return {
    ok: false,
    mode: 'backend',
    rootName: '',
    comfyRoot: '',
    nested: false,
    pythonPath: '',
    pythonSource: '',
    hasGit: false,
    pluginCount: 0,
    plugins: [],
    requirements: null,
    modelsDirs: [],
    reason: '',
  }
}

/* ============ 通用目录扫描（后端真实读取） ============ */

/*
 * 让用户选择模型目录并真实扫描
 * 返回 { ok, dir, models:[{name, size, ext}] }，取消返回 null
 */
export async function scanModelDirectory() {
  const dir = await pickDirectory('选择模型目录')
  if (!dir) return null

  const MODEL_EXTS = [
    '.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.gguf',
    '.onnx', '.torchscript', '.sft', '.fp16', '.pruned',
  ]

  try {
    const res = await call('env_list_dir', [dir, MODEL_EXTS, false], '扫描模型目录需要后端支持')
    const models = (res.files || []).map((f) => ({
      name: f.name,
      size: f.size || 0,
      ext: (f.name || '').toLowerCase().slice((f.name || '').lastIndexOf('.')),
    }))
    return { ok: true, dir, models }
  } catch (e) {
    return { ok: false, dir, models: [], reason: `目录扫描失败：${e?.message || e}` }
  }
}

/*
 * 让用户选择一个目录，真实读取其中（含子目录）符合后缀的文件。
 * 服务于「我的作品」「工作流仓库」等需要列文件的工具页。
 *
 * exts 传空数组表示不限后缀，全部列出。
 * 返回 { ok, dir, files:[{name, path, size}] }；取消返回 null。
 */
export async function scanFilesDirectory(exts = []) {
  const dir = await pickDirectory('选择目录')
  if (!dir) return null

  try {
    const res = await call('env_list_dir', [dir, exts.length ? exts : null, true], '扫描目录需要后端支持')
    return {
      ok: true,
      dir,
      files: (res.files || []).map((f) => ({
        name: f.name,
        path: f.path,
        size: f.size || 0,
      })),
    }
  } catch (e) {
    return { ok: false, dir, files: [], reason: `目录扫描失败：${e?.message || e}` }
  }
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

/* 常用媒体后缀：我的作品 */
export const MEDIA_EXTS = [
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp',
  '.mp4', '.webm', '.mov', '.avi',
]

/* 工作流后缀：工作流仓库 */
export const WORKFLOW_EXTS = ['.json', '.workflow.json']
