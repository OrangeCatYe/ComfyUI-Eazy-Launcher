import { describe, it, expect } from 'vitest'
import cx from '../src/lib/cx'

/*
 * className 合并工具：过滤 falsy 后用空格拼接
 */
describe('cx className 合并', () => {
  it('拼接多个字符串', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c')
  })

  it('过滤掉 false / null / undefined / 空字符串 / 0', () => {
    expect(cx('a', false, null, undefined, '', 0, 'b')).toBe('a b')
  })

  it('条件表达式为假时不产生多余空格', () => {
    const active = false
    expect(cx('base', active && 'active')).toBe('base')
  })

  it('全部为 falsy 时返回空字符串', () => {
    expect(cx(false, null, undefined)).toBe('')
  })

  it('无参数返回空字符串', () => {
    expect(cx()).toBe('')
  })
})
