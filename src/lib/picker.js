/*
 * 文件/目录选择器
 *
 * 环境差异说明：
 *   - Eel 桌面模式：调用后端 tkinter 系统原生对话框，
 *     能拿到真实绝对路径（如 C:\ComfyUI\...），是后端处理文件的前提。
 *   - File System Access API（showDirectoryPicker）能拿到真实目录句柄，
 *     可遍历、可读文件内容，但各浏览器在 file:// 下的支持不一致。
 *   - <input type="file" webkitdirectory> 兼容性最好，
 *     能拿到相对路径与文件内容，但拿不到绝对路径的盘符部分。
 *
 * 策略：后端可用时优先用后端（真实路径），否则依次降级；
 * 两者都只产生真实数据，不做任何伪造。
 */

import { isBackend, tryCall } from './backend'

/* ============ 后端原生对话框（优先） ============ */

/*
 * 选择文件，返回真实绝对路径字符串（取消返回 null）。
 * 后端不可用时返回 undefined，由调用方降级到浏览器方案。
 */
export async function pickFileBackend(title = '选择文件', filetypes = null) {
  if (!isBackend()) return undefined
  const r = await tryCall('dialog_pick_file', [title, filetypes])
  if (!r) return null
  return r.path || null
}

/* 选择目录，返回真实绝对路径字符串（取消返回 null） */
export async function pickDirectoryBackend(title = '选择目录') {
  if (!isBackend()) return undefined
  const r = await tryCall('dialog_pick_dir', [title])
  if (!r) return null
  return r.path || null
}

/* ============ 目录句柄（首选，可遍历+读内容） ============ */

export function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/* 选择目录，返回 FileSystemDirectoryHandle（取消返回 null） */
export async function pickDirectoryHandle() {
  if (!supportsDirectoryPicker()) return null
  try {
    return await window.showDirectoryPicker({ mode: 'read' })
  } catch (err) {
    if (err && err.name === 'AbortError') return null
    /* file:// 下可能被安全策略拦截，交给调用方降级 */
    throw err
  }
}

/* ============ 降级：webkitdirectory ============ */

/* 选择目录，返回目录名（取消返回 null） */
export function pickDirectory() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.directory = true
    input.multiple = false

    let done = false
    const finish = (val) => {
      if (done) return
      done = true
      resolve(val)
    }

    input.onchange = () => {
      const f = input.files?.[0]
      finish(f ? f.webkitRelativePath.split('/')[0] || f.name : null)
    }

    /* 用户取消时 change 不触发，用窗口重新获得焦点兜底 */
    window.addEventListener('focus', () => setTimeout(() => finish(null), 800), { once: true })

    input.click()
  })
}

/* 选择文件，返回文件名（取消返回 null） */
export function pickFile(accept = '') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept

    let done = false
    const finish = (val) => {
      if (done) return
      done = true
      resolve(val)
    }

    input.onchange = () => {
      const f = input.files?.[0]
      finish(f ? f.name : null)
    }

    window.addEventListener('focus', () => setTimeout(() => finish(null), 800), { once: true })

    input.click()
  })
}

/*
 * 选择文本文件，返回 { name, text }（取消或读取失败返回 null）
 * 用于 requirements.txt 的真实内容读取与解析。
 */
export function pickTextFile(accept = '.txt') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept

    let done = false
    const finish = (val) => {
      if (done) return
      done = true
      resolve(val)
    }

    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return finish(null)
      try {
        const text = await f.text()
        finish({ name: f.name, text })
      } catch (e) {
        finish(null)
      }
    }

    window.addEventListener('focus', () => setTimeout(() => finish(null), 800), { once: true })

    input.click()
  })
}
