import { describe, it, expect, afterEach } from 'vitest'
import {
  pickFileBackend,
  pickDirectoryBackend,
  supportsDirectoryPicker,
} from '../src/lib/picker'

/*
 * 文件/目录选择器 —— 只测可在无原生对话框下驱动的分支：
 *   后端优先路径（mock eel）与能力探测。
 * webkitdirectory 降级依赖真实 <input> 点击与窗口焦点，属人工/E2E 范畴，不在此测。
 */

describe('picker 后端优先路径', () => {
  afterEach(() => {
    delete window.eel
    delete window.showDirectoryPicker
  })

  it('无后端时 pickFileBackend 返回 undefined（交由调用方降级）', async () => {
    delete window.eel
    expect(await pickFileBackend()).toBe(undefined)
  })

  it('无后端时 pickDirectoryBackend 返回 undefined', async () => {
    delete window.eel
    expect(await pickDirectoryBackend()).toBe(undefined)
  })

  it('后端返回真实路径时 pickFileBackend 得到该路径', async () => {
    window.eel = {
      dialog_pick_file: () => Promise.resolve({ ok: true, data: { path: 'C:/models/a.safetensors' } }),
    }
    expect(await pickFileBackend()).toBe('C:/models/a.safetensors')
  })

  it('后端用户取消（无 path）时 pickFileBackend 返回 null', async () => {
    window.eel = {
      dialog_pick_file: () => Promise.resolve({ ok: true, data: {} }),
    }
    expect(await pickFileBackend()).toBe(null)
  })

  it('后端返回真实目录路径时 pickDirectoryBackend 得到该路径', async () => {
    window.eel = {
      dialog_pick_dir: () => Promise.resolve({ ok: true, data: { path: 'D:/ComfyUI' } }),
    }
    expect(await pickDirectoryBackend()).toBe('D:/ComfyUI')
  })
})

describe('supportsDirectoryPicker 能力探测', () => {
  afterEach(() => {
    delete window.showDirectoryPicker
  })

  it('存在 showDirectoryPicker 时为 true', () => {
    window.showDirectoryPicker = () => {}
    expect(supportsDirectoryPicker()).toBe(true)
  })

  it('不存在时为 false', () => {
    delete window.showDirectoryPicker
    expect(supportsDirectoryPicker()).toBe(false)
  })
})
