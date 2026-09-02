/*
 * 文件/目录选择器
 *
 * 本应用只以 Eel 桌面模式运行，目录/文件选择一律走后端
 * tkinter 系统原生对话框，拿到真实绝对路径。
 * 无后端时直接抛错（由 backend.call 统一报「未连接后端」），
 * 不再提供任何浏览器降级方案。
 */

import { call } from './backend'

/*
 * 选择文件，返回真实绝对路径字符串（用户取消返回 null）。
 */
export async function pickFile(title = '选择文件', filetypes = null) {
  const r = await call('dialog_pick_file', [title, filetypes], '选择文件需要后端支持')
  return r.path || null
}

/*
 * 选择目录，返回真实绝对路径字符串（用户取消返回 null）。
 */
export async function pickDirectory(title = '选择目录') {
  const r = await call('dialog_pick_dir', [title], '选择目录需要后端支持')
  return r.path || null
}
