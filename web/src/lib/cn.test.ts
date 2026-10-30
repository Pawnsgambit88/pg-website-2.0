import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/cn'

describe('cn', () => {
  it('joins strings with single spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('skips false, null, undefined and empty strings', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('supports conditional parts', () => {
    const active = false
    expect(cn('a', active && 'on', !active && 'off')).toBe('a off')
  })

  it('returns an empty string when nothing is given', () => {
    expect(cn()).toBe('')
  })
})
