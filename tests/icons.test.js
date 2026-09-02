import { describe, it, expect } from 'vitest'
import * as icons from '../src/lib/icons'

/*
 * 图标解析中心：页面配置用图标名字符串，此处统一从 lucide-react re-export。
 * 守卫：页面依赖的图标名必须都存在且为可渲染组件，缺失会导致页面崩溃。
 */

const REQUIRED = [
  'LayoutDashboard', 'Cpu', 'Blocks', 'PackageSearch', 'Wrench', 'Rocket',
  'Settings', 'Boxes', 'Copy', 'ScanEye', 'Workflow', 'Bookmark',
  'Sparkles', 'Film', 'Power', 'Image', 'User', 'Download', 'Cloud',
]

describe('icons 导出完整性', () => {
  it('页面依赖的图标全部已导出', () => {
    REQUIRED.forEach((name) => {
      expect(icons[name], `缺少图标导出：${name}`).toBeDefined()
    })
  })

  it('导出的图标均为可渲染组件（函数或 forwardRef 对象）', () => {
    REQUIRED.forEach((name) => {
      const C = icons[name]
      const renderable = typeof C === 'function' || (typeof C === 'object' && C !== null)
      expect(renderable, `${name} 不是可渲染组件`).toBe(true)
    })
  })
})
