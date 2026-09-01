import { describe, it, expect } from 'vitest'
import { parseRequirements, compareSnapshots } from '../src/lib/api'

/*
 * 依赖解析与环境比较（纯前端真实计算）
 * 对应 openspec: 环境比较工具 / 数据真实性约定
 */

describe('parseRequirements 依赖文本解析', () => {
  it('解析 pkg==版本 形式，包名小写', () => {
    const m = parseRequirements('Torch==2.1.0')
    expect(m.get('torch')).toBe('2.1.0')
  })

  it('支持 >= <= ~= != > < 各种约束符', () => {
    const m = parseRequirements(['a>=1.0', 'b<=2.0', 'c~=3.0', 'd!=4.0', 'e>5', 'f<6'].join('\n'))
    expect(m.get('a')).toBe('1.0')
    expect(m.get('b')).toBe('2.0')
    expect(m.get('c')).toBe('3.0')
    expect(m.get('d')).toBe('4.0')
    expect(m.get('e')).toBe('5')
    expect(m.get('f')).toBe('6')
  })

  it('纯包名（无版本）spec 为空字符串', () => {
    const m = parseRequirements('numpy')
    expect(m.get('numpy')).toBe('')
  })

  it('忽略注释行、空行、-r 嵌套引用', () => {
    const m = parseRequirements('# comment\n\n-r base.txt\n--extra-index-url x\npkg==1.0')
    expect(m.size).toBe(1)
    expect(m.get('pkg')).toBe('1.0')
  })

  it('去除行内注释', () => {
    const m = parseRequirements('flask==2.0  # web framework')
    expect(m.get('flask')).toBe('2.0')
  })

  it('空文本返回空 Map', () => {
    expect(parseRequirements('').size).toBe(0)
    expect(parseRequirements(null).size).toBe(0)
  })
})

describe('compareSnapshots 环境差异比较', () => {
  it('识别新增依赖', () => {
    const r = compareSnapshots('a==1.0', 'a==1.0\nb==2.0')
    expect(r.added).toEqual(['b==2.0'])
    expect(r.removed).toEqual([])
    expect(r.changed).toEqual([])
  })

  it('识别移除依赖', () => {
    const r = compareSnapshots('a==1.0\nb==2.0', 'a==1.0')
    expect(r.removed).toEqual(['b==2.0'])
  })

  it('识别版本变更并给出 from/to', () => {
    const r = compareSnapshots('a==1.0', 'a==2.0')
    expect(r.changed).toEqual([{ name: 'a', from: '1.0', to: '2.0' }])
  })

  it('无差异时三组均为空', () => {
    const r = compareSnapshots('a==1.0\nb==2.0', 'b==2.0\na==1.0')
    expect(r.added).toEqual([])
    expect(r.removed).toEqual([])
    expect(r.changed).toEqual([])
  })

  it('结果按字典序稳定排序', () => {
    const r = compareSnapshots('', 'z==1\na==1\nm==1')
    expect(r.added).toEqual(['a==1', 'm==1', 'z==1'])
  })
})
