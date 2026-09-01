import { describe, it, expect, beforeEach } from 'vitest'
import { LS, readLS, writeLS } from '../src/lib/storage'

/*
 * localStorage 封装（键名沿用原版）
 * 对应 openspec: 键名沿用 / 环境路径单一来源
 */

describe('storage localStorage 封装', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('LS 键名沿用原版约定', () => {
    expect(LS.THEME).toBe('ui_theme')
    expect(LS.SETTINGS).toBe('kk_settings')
    expect(LS.TOOLS_ORDER).toBe('kk_tools_hub_order')
    expect(LS.ENV).toBe('kk_local_env')
  })

  it('写入对象再读出得到等价对象（JSON 往返）', () => {
    writeLS(LS.SETTINGS, { comfyRoot: 'D:/ComfyUI', theme: 'dark' })
    expect(readLS(LS.SETTINGS)).toEqual({ comfyRoot: 'D:/ComfyUI', theme: 'dark' })
  })

  it('写入字符串按原样保存', () => {
    writeLS(LS.THEME, 'dark')
    expect(readLS(LS.THEME)).toBe('dark')
  })

  it('读取不存在的键返回 fallback', () => {
    expect(readLS('not_exist', 'default')).toBe('default')
    expect(readLS('not_exist')).toBe(null)
  })

  it('存储的是非法 JSON 时按原始字符串返回，不抛错', () => {
    window.localStorage.setItem('raw', 'not-json{')
    expect(readLS('raw')).toBe('not-json{')
  })
})
