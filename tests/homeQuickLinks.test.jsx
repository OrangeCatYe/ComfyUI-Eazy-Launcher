import { describe, it, expect, afterEach } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import HomePage from '../src/pages/HomePage'
import { QUICK_LINKS } from '../src/config/tools'

/*
 * 回归：导入环境成功后首页崩溃（ReferenceError: QUICK_LINKS is not defined）
 *
 * 根因：HomePage 渲染 QUICK_LINKS.map(...)，但该常量从未定义或导入。
 * 它藏在 configured 三元分支里，环境未配置时永不执行，
 * 直到首次成功导入才触发——被 ErrorBoundary 捕获成全屏错误。
 *
 * 项目未安装 @testing-library/react，故用 react-dom/client 手动渲染。
 */

const CONFIGURED = { comfyRoot: 'C:/ComfyUI/ComfyUI/ComfyUI', pythonPath: 'C:/x/.venv/python.exe' }
const ENV = {
  verified: true,
  pluginCount: 4,
  plugins: ['A', 'B', 'C', 'D'],
  pythonPath: 'C:/x/.venv/python.exe',
  comfyRoot: 'C:/ComfyUI/ComfyUI/ComfyUI',
  hasGit: true,
  modelsDirs: [],
  scannedAt: new Date().toISOString(),
}

function mount(props) {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const root = createRoot(div)
  let ref = null
  act(() => {
    ref = createElement(HomePage, props)
    root.render(ref)
  })
  return { div, root }
}

describe('HomePage 已配置态（QUICK_LINKS 回归）', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      act(() => mounted.root.unmount())
      mounted.div.remove()
      mounted = null
    }
  })

  it('QUICK_LINKS 常量存在且字段完整', () => {
    expect(Array.isArray(QUICK_LINKS)).toBe(true)
    expect(QUICK_LINKS.length).toBeGreaterThan(0)
    for (const it of QUICK_LINKS) {
      expect(typeof it.id).toBe('string')
      expect(it.id.length).toBeGreaterThan(0)
      expect(typeof it.label).toBe('string')
      /* lucide-react@1.38 的图标是 ForwardRefExoticComponent（对象）而非纯函数 */
      expect(it.icon).toBeTruthy()
    }
  })

  it('已配置时渲染快捷入口，不再抛 ReferenceError', () => {
    mounted = mount({
      config: CONFIGURED,
      env: ENV,
      running: false,
      onLaunch: () => {},
      onImportEnv: () => {},
      onLog: () => {},
      onNavigate: () => {},
    })
    const text = mounted.div.textContent
    for (const it of QUICK_LINKS) {
      expect(text.includes(it.label)).toBe(true)
    }
  })

  it('已配置态还展示真实路径与插件数', () => {
    mounted = mount({
      config: CONFIGURED,
      env: ENV,
      running: false,
      onLaunch: () => {},
      onImportEnv: () => {},
      onLog: () => {},
      onNavigate: () => {},
    })
    const text = mounted.div.textContent
    expect(text.includes('C:/ComfyUI/ComfyUI/ComfyUI')).toBe(true)
    expect(text.includes('尚未配置环境')).toBe(false)
  })

  it('未配置时仍显示引导态，不受影响', () => {
    mounted = mount({
      config: { comfyRoot: '', pythonPath: '' },
      env: null,
      running: false,
      onLaunch: () => {},
      onImportEnv: () => {},
      onLog: () => {},
      onNavigate: () => {},
    })
    expect(mounted.div.textContent.includes('尚未配置环境')).toBe(true)
  })
})
