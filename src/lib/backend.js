/*
 * 后端桥接层
 *
 * 负责：探测 Eel 是否可用、把后端结果归一化、在没有后端时给出统一提示。
 *
 * 设计要点：
 *   - Eel 的调用是异步 Promise，且后端统一返回 { ok, data, error, log }
 *   - 所有后端日志（log 数组）都要转发到终端面板，保证"过程可见"
 *   - 后端不可用时，抛出明确错误，由调用方展示"启动后端后可完成"
 */

/* Eel 注入的全局对象；file:// 直接打开时为 undefined */
export function isBackend() {
  return typeof window !== 'undefined' && typeof window.eel !== 'undefined'
}

/*
 * 等待 Eel 就绪。

 * eel.js 是异步注入的，页面刚加载时 window.eel 可能还没挂上，
 * 直接判断会误判成「浏览器模式」而降级，表现为莫名其妙的失败。
 * 这里轮询等待；真正不可用（ file:// 或纯浏览器打开）则超时返回 false。
 */
export function waitBackend(timeoutMs = 8000) {
  if (isBackend()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (isBackend()) {
        clearInterval(timer)
        resolve(true)
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, 50)
  })
}

/* 供 UI 判断用：当前是否运行在 Eel 桌面模式 */
export function backendMode() {
  return isBackend() ? 'eel' : 'browser'
}

/* 把后端返回的 log 数组推到终端 */
export function emitLogs(result, push) {
  if (!push || !result || !Array.isArray(result.log)) return
  result.log.forEach((line) => push({ level: 'info', text: String(line) }))
}

/*
 * 调用后端函数的统一包装。
 *
 * fn       —— window.eel 上的函数名
 * args     —— 参数数组
 * fallback —— 后端不可用时的错误文案
 * push     —— 终端日志回调（可选）
 *
 * 成功返回后端 data；失败抛出带明确原因的 Error。
 */
export async function call(fn, args = [], fallback = '该操作需要后端支持', push = null) {
  if (!isBackend()) {
    throw new Error(`${fallback}（当前未连接后端，请通过启动器打开本程序）`)
  }

  const target = window.eel[fn]
  if (typeof target !== 'function') {
    throw new Error(`后端未提供 ${fn} 接口，请更新后端程序`)
  }

  let res
  try {
    /*
     * Eel 的调用约定是「双重调用」：
     *   eel.fn(args)     —— 只发送 WebSocket 消息，返回 _call_return() 里的 function
     *   eel.fn(args)()   —— 再调用一次，才注册回调并返回 Promise
     *
     * 少写第二层括号时，await 拿到的是函数对象（函数不是 thenable），
     * 于是立即返回该函数；后端其实已经执行完毕（对话框也弹了、目录也扫了），
     * 但返回值被丢弃，前端拿到 undefined 的 data，判定为「用户取消」，
     * 表现为「点击后毫无反应」且不报错。
     *
     * 这里兼容两种形态：Eel 返回 function，测试 mock 直接返回 Promise。
     */
    const ret = target(...args)
    res = typeof ret === 'function' ? await ret() : await ret
  } catch (e) {
    throw new Error(`后端调用失败：${e?.message || e}`)
  }

  /* 兜底防御：若仍是函数，说明调用约定不符，明确报错而不是静默失败 */
  if (typeof res === 'function') {
    throw new Error(`后端 ${fn} 调用约定异常：未返回 Promise`)
  }

  emitLogs(res, push)

  if (!res || res.ok === false) {
    const err = res?.error || '后端执行失败'
    throw new Error(err)
  }
  return res?.data ?? {}
}

/*
 * 只探测、不抛错的版本：用于"能用后端就用，不能就保持前端行为"的场景。
 * 返回 null 表示后端不可用或调用失败。
 */
export async function tryCall(fn, args = [], push = null) {
  try {
    return await call(fn, args, '', push)
  } catch {
    return null
  }
}
