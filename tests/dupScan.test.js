// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findDuplicates } from '../src/lib/dupScan'

/*
 * 重复文件检测引擎 —— 用 mock 的 File System Access 目录句柄驱动。
 * 本套件跑在 node 环境：dupScan 不依赖 DOM，且 node 内置的 Blob 与
 * globalThis.crypto.subtle 均可用，避开 jsdom 下 Blob/crypto 的实现差异。
 */

/* 构造带内容的文件句柄；content 为字符串，转成 Blob 以支持 slice/arrayBuffer/size */
function fileHandle(name, content) {
  const blob = new Blob([content])
  return {
    kind: 'file',
    name,
    async getFile() {
      return {
        size: blob.size,
        slice: (s, e) => blob.slice(s, e),
        arrayBuffer: () => blob.arrayBuffer(),
      }
    },
  }
}

/* 构造目录句柄：entries 形如 { 文件名: 内容 }，支持嵌套用对象 */
function dirHandle(name, entries) {
  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const [n, v] of Object.entries(entries)) {
        if (typeof v === 'string') yield [n, fileHandle(n, v)]
        else yield [n, dirHandle(n, v)]
      }
    },
  }
}

describe('findDuplicates 重复检测', () => {
  it('未选目录返回 ok:false', async () => {
    const r = await findDuplicates(null, ['.txt'], 'name')
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('未选择目录')
  })

  it('目录内无匹配后缀文件返回空组', async () => {
    const dir = dirHandle('d', { 'a.png': 'x' })
    const r = await findDuplicates(dir, ['.safetensors'], 'name')
    expect(r.ok).toBe(true)
    expect(r.groups).toEqual([])
  })

  it('name 模式：同名文件（跨子目录）归为一组', async () => {
    const dir = dirHandle('root', {
      'model.safetensors': 'aaa',
      sub: { 'model.safetensors': 'bbb' },
    })
    const r = await findDuplicates(dir, ['.safetensors'], 'name')
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].files).toHaveLength(2)
    expect(r.dupFiles).toBe(2)
  })

  it('name 模式：文件名各异则无重复组', async () => {
    const dir = dirHandle('root', {
      'a.ckpt': '1',
      'b.ckpt': '2',
    })
    const r = await findDuplicates(dir, ['.ckpt'], 'name')
    expect(r.groups).toEqual([])
  })

  it('hash 模式：内容相同的文件归为一组', async () => {
    const dir = dirHandle('root', {
      'x.safetensors': 'IDENTICAL-CONTENT',
      'y.safetensors': 'IDENTICAL-CONTENT',
      'z.safetensors': 'different',
    })
    const r = await findDuplicates(dir, ['.safetensors'], 'hash')
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].files.map((f) => f.name).sort()).toEqual(['x.safetensors', 'y.safetensors'])
  })

  it('hash 模式：内容不同则不成组', async () => {
    const dir = dirHandle('root', {
      'x.safetensors': 'aaa',
      'y.safetensors': 'bbb',
    })
    const r = await findDuplicates(dir, ['.safetensors'], 'hash')
    expect(r.groups).toEqual([])
  })

  it('后缀匹配大小写不敏感', async () => {
    const dir = dirHandle('root', {
      'A.SAFETENSORS': 'same',
      'b.safetensors': 'same',
    })
    const r = await findDuplicates(dir, ['.safetensors'], 'hash')
    expect(r.groups).toHaveLength(1)
  })

  it('进度回调被调用', async () => {
    const dir = dirHandle('root', { 'a.pt': 'x', 'b.pt': 'y' })
    let called = 0
    await findDuplicates(dir, ['.pt'], 'name', () => { called += 1 })
    expect(called).toBeGreaterThan(0)
  })
})
