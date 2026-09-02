import { describe, it, expect, afterEach } from 'vitest'
import { isBackend, call, emitLogs } from '../src/lib/backend'

/*
 * 后端桥接层（Eel）
 * 对应 openspec: 数据真实性约定 —— 无后端时不得假装成功，须抛明确错误
 */

describe('backend 桥接层', () => {
  afterEach(() => {
    delete window.eel
  })

  it('未注入 eel 时判定为无后端', () => {
    delete window.eel
    expect(isBackend()).toBe(false)
  })

  it('注入 eel 后判定为有后端', () => {
    window.eel = {}
    expect(isBackend()).toBe(true)
  })

  it('无后端时 call 抛出带 fallback 文案的明确错误（不假装成功）', async () => {
    delete window.eel
    await expect(call('any_fn', [], '该操作需要后端')).rejects.toThrow('该操作需要后端')
  })

  it('后端未提供该接口时抛出提示更新后端', async () => {
    window.eel = {}
    await expect(call('missing_fn', [])).rejects.toThrow('后端未提供 missing_fn 接口')
  })

  it('后端返回 ok:true 时解析出 data', async () => {
    window.eel = { good: () => Promise.resolve({ ok: true, data: { n: 42 }, log: [] }) }
    await expect(call('good')).resolves.toEqual({ n: 42 })
  })

  it('后端返回 ok:false 时抛出后端 error 文案', async () => {
    window.eel = { bad: () => Promise.resolve({ ok: false, error: '磁盘满' }) }
    await expect(call('bad')).rejects.toThrow('磁盘满')
  })

  it('emitLogs 把后端 log 数组逐行推到终端回调', () => {
    const lines = []
    emitLogs({ log: ['a', 'b'] }, (x) => lines.push(x.text))
    expect(lines).toEqual(['a', 'b'])
  })
})
