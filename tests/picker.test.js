import { describe, it, expect, afterEach } from 'vitest'
import { pickFile, pickDirectory } from '../src/lib/picker'

/*
 * 文件/目录选择器 —— 只走后端原生对话框。
 * mock window.eel 验证转发与解析；无后端时 call 统一抛错。
 */

describe('picker 后端选择对话框', () => {
  afterEach(() => {
    delete window.eel
  })

  it('无后端时 pickFile 抛出明确错误', async () => {
    delete window.eel
    await expect(pickFile()).rejects.toThrow('未连接后端')
  })

  it('无后端时 pickDirectory 抛出明确错误', async () => {
    delete window.eel
    await expect(pickDirectory()).rejects.toThrow('未连接后端')
  })

  it('后端返回真实路径时 pickFile 得到该路径', async () => {
    window.eel = {
      dialog_pick_file: () => Promise.resolve({ ok: true, data: { path: 'C:/models/a.safetensors' } }),
    }
    expect(await pickFile()).toBe('C:/models/a.safetensors')
  })

  it('后端用户取消（无 path）时 pickFile 返回 null', async () => {
    window.eel = {
      dialog_pick_file: () => Promise.resolve({ ok: true, data: {} }),
    }
    expect(await pickFile()).toBe(null)
  })

  it('后端返回真实目录路径时 pickDirectory 得到该路径', async () => {
    window.eel = {
      dialog_pick_dir: () => Promise.resolve({ ok: true, data: { path: 'D:/ComfyUI' } }),
    }
    expect(await pickDirectory()).toBe('D:/ComfyUI')
  })
})
