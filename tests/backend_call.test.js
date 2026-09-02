import { describe, it, expect, afterEach } from 'vitest'
import { call } from '../src/lib/backend'

/*
 * Eel 真实调用约定回归测试
 *
 * eel.js 的 _import_py_function 生成的是：
 *     eel[name] = function() { ws.send(...); return eel._call_return(call_object); }
 * 而 _call_return 返回 function(callback = null)，再次调用才返回 Promise。
 *
 * 因此正确写法是 eel.fn(args)()。若只写 eel.fn(args)，await 得到的是函数对象
 * （函数不是 thenable，await 会原样返回），后端结果被静默丢弃，
 * 表现为「点了按钮毫无反应」且不抛错 —— 这正是本测试要锁死的行为。
 */

describe('call: Eel 双重调用约定', () => {
  afterEach(() => {
    delete window.eel
  })

  it('真实 Eel 形态（返回 function）时，解出后端 data', async () => {
    window.eel = {
      env_scan_root: (p) => () =>
        Promise.resolve({ ok: true, data: { comfyRoot: p, pluginCount: 4 } }),
    }
    const r = await call('env_scan_root', ['C:/ComfyUI'])
    expect(r.pluginCount).toBe(4)
    expect(r.comfyRoot).toBe('C:/ComfyUI')
  })

  it('mock 形态（直接返回 Promise）时同样可用，向后兼容', async () => {
    window.eel = {
      env_scan_root: () => Promise.resolve({ ok: true, data: { pluginCount: 2 } }),
    }
    const r = await call('env_scan_root', ['D:/x'])
    expect(r.pluginCount).toBe(2)
  })

  it('真实 Eel 形态下后端的 ok:false 能被正确抛出', async () => {
    window.eel = {
      dialog_pick_dir: () => () => Promise.resolve({ ok: false, error: 'cancelled' }),
    }
    await expect(call('dialog_pick_dir', ['t'])).rejects.toThrow('cancelled')
  })

  it('回归防线：若返回值仍是函数，必须抛错而非静默失败', async () => {
    window.eel = {
      weird: () => () => () => Promise.resolve({ ok: true, data: {} }),
    }
    await expect(call('weird', [])).rejects.toThrow(/调用约定异常/)
  })

  it('无后端时抛出明确错误', async () => {
    delete window.eel
    await expect(call('env_scan_root', ['x'])).rejects.toThrow(/当前未连接后端/)
  })
})
