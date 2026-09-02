import { describe, it, expect } from 'vitest'
import {
  emptyScan,
  formatBytes,
  summarizeScan,
  MEDIA_EXTS,
  WORKFLOW_EXTS,
} from '../src/lib/envScan'

/*
 * 环境扫描器的纯函数与常量。
 * 目录遍历（walkHandle / analyzeFileList）依赖 File System Access / FileList，
 * 属集成/E2E 范畴，此处只测确定性纯逻辑。
 */

describe('emptyScan 空结果结构', () => {
  it('所有字段代表「未识别」的初始态', () => {
    const s = emptyScan()
    expect(s.ok).toBe(false)
    expect(s.mode).toBe('backend')
    expect(s.comfyRoot).toBe('')
    expect(s.pluginCount).toBe(0)
    expect(s.plugins).toEqual([])
    expect(s.requirements).toBe(null)
    expect(s.modelsDirs).toEqual([])
  })
})

describe('formatBytes 体积格式化', () => {
  it('0 或负数返回占位符 —', () => {
    expect(formatBytes(0)).toBe('—')
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(null)).toBe('—')
  })

  it('小于 1KB 显示字节且不带小数', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('KB / MB / GB 逐级换算并保留一位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1024 * 1024 * 1024 * 3)).toBe('3.0 GB')
  })

  it('超大值封顶到 TB', () => {
    expect(formatBytes(1024 ** 4 * 2)).toBe('2.0 TB')
  })
})

describe('summarizeScan 扫描结果摘要', () => {
  it('传入 null 返回空数组', () => {
    expect(summarizeScan(null)).toEqual([])
  })

  it('未识别时输出原因行', () => {
    const lines = summarizeScan({ ok: false, rootName: 'X', reason: '没有内核特征' })
    expect(lines[0]).toContain('X')
    expect(lines.some((l) => l.includes('未识别') && l.includes('没有内核特征'))).toBe(true)
  })

  it('识别成功时含根目录、Python 环境类型、插件数、Git 状态', () => {
    const lines = summarizeScan({
      ok: true,
      rootName: 'ComfyUI',
      comfyRoot: 'ComfyUI/ComfyUI',
      nested: true,
      pythonPath: 'ComfyUI/.venv/Scripts/python.exe',
      pythonSource: 'venv',
      pluginCount: 2,
      plugins: ['Manager', 'Impact'],
      modelsDirs: ['checkpoints', 'loras'],
      hasGit: true,
    })
    const joined = lines.join('\n')
    expect(joined).toContain('ComfyUI/ComfyUI')
    expect(joined).toContain('已自动下钻定位')
    expect(joined).toContain('虚拟环境')
    expect(joined).toContain('2 个')
    expect(joined).toContain('Git 仓库：是')
  })

  it('插件超过 5 个时用「等」省略', () => {
    const lines = summarizeScan({
      ok: true, rootName: 'r', comfyRoot: 'r', nested: false,
      pythonPath: '', pythonSource: '',
      pluginCount: 7, plugins: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      modelsDirs: [], hasGit: false,
    })
    expect(lines.some((l) => l.includes('等'))).toBe(true)
  })

  it('无 Python 路径时标注未找到', () => {
    const lines = summarizeScan({
      ok: true, rootName: 'r', comfyRoot: 'r', nested: false,
      pythonPath: '', pythonSource: '',
      pluginCount: 0, plugins: [], modelsDirs: [], hasGit: false,
    })
    expect(lines.some((l) => l.includes('Python 解释器：未找到'))).toBe(true)
  })
})

describe('文件后缀常量', () => {
  it('MEDIA_EXTS 含常见图片与视频后缀', () => {
    expect(MEDIA_EXTS).toContain('.png')
    expect(MEDIA_EXTS).toContain('.mp4')
  })

  it('WORKFLOW_EXTS 含 .json', () => {
    expect(WORKFLOW_EXTS).toContain('.json')
  })
})
