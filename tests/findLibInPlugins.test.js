import { describe, it, expect } from 'vitest'
import { findLibInPlugins } from '../src/lib/api'

/*
 * 查询引用插件（真实扫描 custom_nodes 的 requirements.txt）
 * 用假的 File System Access 目录句柄驱动，验证真实扫描逻辑与"无结果不编造"。
 */

/* 构造一个最小可用的目录句柄 mock */
function makeDirHandle(plugins) {
  // plugins: { 插件名: requirements文本 | null }
  return {
    async *entries() {
      for (const [name, req] of Object.entries(plugins)) {
        yield [
          name,
          {
            kind: 'directory',
            async getFileHandle(fn) {
              if (fn === 'requirements.txt' && req != null) {
                return { async getFile() { return { async text() { return req } } } }
              }
              throw new Error('NotFound')
            },
          },
        ]
      }
    },
  }
}

describe('findLibInPlugins 查询引用插件', () => {
  it('库名为空时直接返回原因，不扫描', async () => {
    const r = await findLibInPlugins(makeDirHandle({}), '')
    expect(r.plugins).toEqual([])
    expect(r.reason).toBe('库名为空')
  })

  it('未提供目录句柄时提示需要选择目录', async () => {
    const r = await findLibInPlugins(null, 'torch')
    expect(r.plugins).toEqual([])
    expect(r.reason).toContain('尚未选择 ComfyUI 目录')
  })

  it('命中声明了该库的插件（按名排序）', async () => {
    const handle = makeDirHandle({
      pluginB: 'torch==2.0\nnumpy',
      pluginA: 'torch>=1.0',
      pluginC: 'pillow',
    })
    const r = await findLibInPlugins(handle, 'torch')
    expect(r.plugins).toEqual(['pluginA', 'pluginB'])
  })

  it('无插件依赖时返回空数组并说明已扫描数量（不编造结果）', async () => {
    const handle = makeDirHandle({ p1: 'numpy', p2: null })
    const r = await findLibInPlugins(handle, 'torch')
    expect(r.plugins).toEqual([])
    expect(r.scanned).toBe(2)
    expect(r.reason).toContain('均未在其 requirements.txt 中声明')
  })

  it('库名大小写不敏感', async () => {
    const handle = makeDirHandle({ p1: 'Torch==2.0' })
    const r = await findLibInPlugins(handle, 'TORCH')
    expect(r.plugins).toEqual(['p1'])
  })
})
