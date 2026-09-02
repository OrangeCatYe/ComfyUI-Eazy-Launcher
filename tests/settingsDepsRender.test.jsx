import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import DepsPage from '../src/pages/DepsPage'
import SettingsPage from '../src/pages/SettingsPage'
import App from '../src/App'
import { SettingsProvider } from '../src/store/settingsStore'
import { ToastProvider } from '../src/components/ui/Toast'
import { OPTIONS, DEFAULT_SETTINGS } from '../src/config/settings'

/*
 * 回归：点击「环境依赖」「全局设置」触发崩溃
 *
 * 缺陷 1（环境依赖，Minified React error #31）：
 *   MIRRORS 元素是 {name,url} 对象，却被直接当 <option value> 与 children 渲染
 *   -> objects are not valid as a React child。
 *   同时 setMirror(best.name) 存的是字符串，与初值对象本就不一致。
 *
 * 缺陷 2（全局设置，ReferenceError: set is not defined）：
 *   SaveBar 只解构了 {settings, reset}，「导入配置」里却调用 set(k, v)。
 *
 * 两者都只在真正渲染该页面时才暴露，故此处做真实渲染断言。
 * 项目未安装 @testing-library/react，故用 react-dom/client 手动渲染。
 */

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = vi.fn()
})

function mount(node) {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const root = createRoot(div)
  act(() => {
    root.render(
      createElement(SettingsProvider, null, createElement(ToastProvider, null, node))
    )
  })
  return { div, root }
}

describe('环境依赖页（MIRRORS 对象渲染回归）', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      act(() => mounted.root.unmount())
      mounted.div.remove()
      mounted = null
    }
  })

  it('渲染不崩溃，镜像源下拉为字符串选项而非对象', () => {
    mounted = mount(createElement(DepsPage, { onAction: () => {}, logs: [] }))
    const select = mounted.div.querySelector('select')
    expect(select, '应渲染出镜像源下拉框').toBeTruthy()

    const values = [...select.options].map((o) => o.value)
    expect(values).toEqual(['阿里云', '清华大学', '腾讯云', '华为云', '官方源'])
    expect(values.some((v) => v.includes('[object Object]'))).toBe(false)
    expect(select.value).toBe('阿里云')
  })

  it('下拉项文本正常渲染，不出现 React error #31', () => {
    mounted = mount(createElement(DepsPage, { onAction: () => {}, logs: [] }))
    const text = mounted.div.textContent
    expect(text.includes('阿里云')).toBe(true)
    expect(text.includes('官方源')).toBe(true)
    expect(text.includes('[object Object]')).toBe(false)
  })
})

describe('全局设置页（SaveBar 的 set 回归）', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      act(() => mounted.root.unmount())
      mounted.div.remove()
      mounted = null
    }
  })

  it('渲染不崩溃', () => {
    mounted = mount(createElement(SettingsPage))
    const text = mounted.div.textContent
    expect(text.includes('性能优化')).toBe(true)
    expect(mounted.div.querySelectorAll('select').length).toBeGreaterThan(0)
  })

  it('切到软件设置页并渲染 SaveBar 的导出/导入按钮', () => {    mounted = mount(createElement(SettingsPage))
    const btn = [...mounted.div.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === '软件设置'
    )
    expect(btn, '应找到「软件设置」Tab').toBeTruthy()

    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const labels = [...mounted.div.querySelectorAll('button')].map((b) => b.textContent.trim())
    expect(labels.includes('导出配置')).toBe(true)
    expect(labels.includes('导入配置')).toBe(true)
  })
})

/*
 * 端到端：真实挂载整个 App，走用户实际的点击路径。
 * 单独渲染页面组件可能漏掉 Provider 缺失、导航状态等问题，
 * 这里从侧边栏点击进去，断言不落入错误边界。
 */
describe('端到端：侧边栏导航不崩溃', () => {
  it('点击「环境依赖」「全局设置」均不出现错误边界', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const root = createRoot(div)
    act(() => root.render(createElement(App)))

    try {
      for (const label of ['环境依赖', '全局设置']) {
        const btn = [...div.querySelectorAll('button')].find(
          (b) => b.textContent.trim() === label
        )
        expect(btn, `未找到侧边栏按钮：${label}`).toBeTruthy()
        act(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
        expect(
          div.textContent.includes('界面渲染出错'),
          `点击「${label}」后出现崩溃界面`
        ).toBe(false)
      }

      // 回到环境依赖页，校验镜像源下拉已是字符串
      const back = [...div.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === '环境依赖'
      )
      act(() => back.dispatchEvent(new MouseEvent('click', { bubbles: true })))
      const select = div.querySelector('select')
      expect(select, '环境依赖页应有镜像源下拉').toBeTruthy()
      expect([...select.options].map((o) => o.value)).toEqual([
        '阿里云',
        '清华大学',
        '腾讯云',
        '华为云',
        '官方源',
      ])
    } finally {
      act(() => root.unmount())
      div.remove()
    }
  })
})

/*
 * 对整个选项表做体检，防止同类隐患再混入。
 * 本次即由此发现 previewMethod 里有两个 value='auto'（重复 key），
 * 会让下拉出现两个「自动」并触发 React 重复 key 警告。
 */
describe('OPTIONS 选项表健康检查', () => {
  it('每项都有字符串 value/label，且同组内 value 不重复', () => {
    for (const [group, list] of Object.entries(OPTIONS)) {
      expect(Array.isArray(list) && list.length > 0, `${group} 应为非空数组`).toBe(true)
      const seen = new Set()
      for (const o of list) {
        expect(typeof o.value, `${group} 存在非字符串 value`).toBe('string')
        expect(typeof o.label, `${group} 存在非字符串 label`).toBe('string')
        expect(seen.has(o.value), `${group} 存在重复 value: ${o.value}`).toBe(false)
        seen.add(o.value)
      }
    }
  })

  it('DEFAULT_SETTINGS 的取值都落在对应选项组内', () => {
    const pairs = [
      ['computeEngine', 'computeEngine'],
      ['vramMode', 'vramMode'],
      ['cudaMalloc', 'cudaMalloc'],
      ['attentionMode', 'attentionMode'],
      ['previewMethod', 'previewMethod'],
      ['weightDtype', 'dtype'],
      ['textEncoderDtype', 'dtype'],
      ['unetDtype', 'dtype'],
      ['vaeDtype', 'dtype'],
      ['apiType', 'apiType'],
      ['uiScale', 'uiScale'],
      ['closeBehavior', 'closeBehavior'],
    ]
    for (const [key, group] of pairs) {
      const allowed = OPTIONS[group].map((o) => o.value)
      expect(
        allowed.includes(DEFAULT_SETTINGS[key]),
        `${key} 默认值 ${DEFAULT_SETTINGS[key]} 不在 ${group} 选项内`
      ).toBe(true)
    }
  })
})
