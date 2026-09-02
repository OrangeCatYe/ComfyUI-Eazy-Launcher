import { describe, it, expect, vi } from 'vitest'
import { createLogger, delay } from '../src/lib/logger'

/*
 * 终端日志写入器
 * 重点回归：曾因只支持字符串、调用方传对象导致 "[object Object]" 的 bug。
 */

/* 用一个可捕获 setLogs 更新的假 state 驱动 logger */
function makeSink() {
  let logs = []
  const setLogs = (updater) => {
    logs = typeof updater === 'function' ? updater(logs) : updater
  }
  return { setLogs, get: () => logs }
}

describe('createLogger 日志写入器', () => {
  it('push 纯字符串默认写入 info 级', () => {
    const s = makeSink()
    createLogger(s.setLogs).push('hello')
    expect(s.get()).toHaveLength(1)
    expect(s.get()[0]).toMatchObject({ level: 'info', text: 'hello' })
  })

  it('push 对象按其 level 上色', () => {
    const s = makeSink()
    createLogger(s.setLogs).push({ level: 'error', text: '出错了' })
    expect(s.get()[0]).toMatchObject({ level: 'error', text: '出错了' })
  })

  it('回归：对象不会变成 [object Object]', () => {
    const s = makeSink()
    createLogger(s.setLogs).push({ level: 'warn', text: '真实文本' })
    expect(s.get()[0].text).toBe('真实文本')
    expect(s.get()[0].text).not.toContain('[object Object]')
  })

  it('含 \\n 的文本按行展开，每行沿用同一 level', () => {
    const s = makeSink()
    createLogger(s.setLogs).push({ level: 'error', text: '第一行\n第二行\n第三行' })
    const logs = s.get()
    expect(logs).toHaveLength(3)
    expect(logs.map((l) => l.text)).toEqual(['第一行', '第二行', '第三行'])
    expect(logs.every((l) => l.level === 'error')).toBe(true)
  })

  it('push null / undefined 不产生日志行', () => {
    const s = makeSink()
    const logger = createLogger(s.setLogs)
    logger.push(null)
    logger.push(undefined)
    expect(s.get()).toHaveLength(0)
  })

  it('pushLines 批量写入多条', () => {
    const s = makeSink()
    createLogger(s.setLogs).pushLines(['a', 'b', { level: 'info', text: 'c' }])
    expect(s.get().map((l) => l.text)).toEqual(['a', 'b', 'c'])
  })

  it('clear 清空日志', () => {
    const s = makeSink()
    const logger = createLogger(s.setLogs)
    logger.push('x')
    logger.clear()
    expect(s.get()).toEqual([])
  })

  it('每行带 at 时间戳', () => {
    const s = makeSink()
    createLogger(s.setLogs).push('t')
    expect(typeof s.get()[0].at).toBe('number')
  })
})

describe('delay 异步延时', () => {
  it('返回一个在指定毫秒后 resolve 的 Promise', async () => {
    vi.useFakeTimers()
    let done = false
    const p = delay(500).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(500)
    await p
    expect(done).toBe(true)
    vi.useRealTimers()
  })
})
