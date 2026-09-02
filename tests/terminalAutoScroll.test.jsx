// 回归验证：日志流自动滚动策略（v2 —— 用户输入事件驱动）
//
// 用户需求：
//   1. 默认自动滚动到底部
//   2. 用户主动上滑（滚轮上滚/触屏上滑/PageUp）→ 停止自动滚动
//   3. 暂停时在「AI日志分析」左侧显示「开启日志自动滚动」按钮
//   4. 点击按钮或滑回日志最底部 → 恢复自动滚动
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { TerminalDrawer } from '../src/components/layout/TerminalDrawer'

/** 挂载带日志的终端，返回工具函数 */
function mountDrawer(props = {}) {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const root = createRoot(div)
  const render = (logs) => {
    act(() => {
      root.render(
        createElement(TerminalDrawer, {
          open: true,
          logs,
          height: 340,
          ...props,
        })
      )
    })
  }
  render([{ level: 'info', text: 'line1' }])
  return { div, root, render, cleanup: () => { act(() => root.unmount()); div.remove() } }
}

/** 日志滚动容器 */
function bodyOf(container) {
  return container.querySelector('.overflow-y-auto')
}

/** 模拟可滚动布局（jsdom 无布局引擎） */
function mockScrollable(el, { scrollHeight, clientHeight }) {
  let top = 0
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (v) => {
      top = Math.max(0, Math.min(scrollHeight - clientHeight, v))
    },
  })
}

/** 找到「开启日志自动滚动」按钮（头部或底部悬浮） */
function autoBtnOf(container) {
  return [...container.querySelectorAll('button')].find((b) =>
    b.textContent.includes('开启日志自动滚动')
  )
}

describe('日志自动滚动策略', () => {
  let m

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    if (m) {
      m.cleanup()
      m = null
    }
  })

  it('默认不显示「开启日志自动滚动」按钮（自动滚动开启）', () => {
    m = mountDrawer()
    expect(autoBtnOf(m.div)).toBeUndefined()
  })

  it('滚轮上滚（wheel deltaY<0）暂停自动滚动，按钮出现', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => {
      body.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
    })
    expect(autoBtnOf(m.div), '上滚后应显示开启按钮').toBeTruthy()
  })

  it('滚轮下滚不暂停自动滚动', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => {
      body.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }))
    })
    expect(autoBtnOf(m.div), '下滚不应暂停').toBeUndefined()
  })

  it('PageUp / ArrowUp 暂停，End 恢复', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => {
      body.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
    })
    expect(autoBtnOf(m.div), 'PageUp 应暂停').toBeTruthy()
    act(() => {
      body.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(autoBtnOf(m.div), 'End 应恢复').toBeUndefined()
  })

  it('暂停后用户滑回最底部（距底 <24px）自动恢复', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => {
      body.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
    })
    expect(autoBtnOf(m.div)).toBeTruthy()
    // 用户手动滚回底部
    act(() => {
      body.scrollTop = 300
      body.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    expect(autoBtnOf(m.div), '滑回底部应自动恢复').toBeUndefined()
  })

  it('点击「开启日志自动滚动」按钮后恢复并贴底', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => {
      body.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
    })
    const btn = autoBtnOf(m.div)
    expect(btn).toBeTruthy()
    act(() => btn.click())
    expect(autoBtnOf(m.div), '点击后按钮应消失').toBeUndefined()
    expect(body.scrollTop, '恢复后应贴底').toBe(300)
  })

  it('自动滚动开启时新日志到达贴底；暂停时新日志不改变位置', () => {
    m = mountDrawer()
    const body = bodyOf(m.div)
    mockScrollable(body, { scrollHeight: 500, clientHeight: 200 })
    act(() => m.render([{ level: 'info', text: 'a' }]))
    expect(body.scrollTop, '开启时贴底').toBe(300)
    act(() => {
      body.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
    })
    act(() => {
      body.scrollTop = 80
    })
    act(() => m.render([{ level: 'info', text: 'a' }, { level: 'info', text: 'b' }]))
    expect(body.scrollTop, '暂停时新日志不应改变位置').toBe(80)
  })
})
