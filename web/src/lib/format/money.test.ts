import { describe, expect, it } from 'vitest'
import { formatInr } from '@/lib/format/money'

describe('formatInr (integer paise, AC-115)', () => {
  it.each([
    [0, 'Free'],
    [100, '₹1'],
    [50000, '₹500'],
    [150050, '₹1,500.50'],
    [99900, '₹999'],
    [12000000, '₹1,20,000'],
    [10000000, '₹1,00,000'],
    [99999900, '₹9,99,999'],
    [100000000, '₹10,00,000'],
    [1234567800, '₹1,23,45,678'],
    [12345678900, '₹12,34,56,789'],
    [123456789012, '₹1,23,45,67,890.12'],
  ])('%i paise -> %s', (paise, expected) => {
    expect(formatInr(paise)).toBe(expected)
  })

  it('shows two decimals for any fractional amount, including 1 paise (no rounding)', () => {
    expect(formatInr(1)).toBe('₹0.01')
    expect(formatInr(5)).toBe('₹0.05')
    expect(formatInr(99)).toBe('₹0.99')
    expect(formatInr(101)).toBe('₹1.01')
    expect(formatInr(110)).toBe('₹1.10')
    expect(formatInr(29999)).toBe('₹299.99')
  })

  it('does not group below 1,000 and groups at 1,000', () => {
    expect(formatInr(99900)).toBe('₹999')
    expect(formatInr(100000)).toBe('₹1,000')
    expect(formatInr(1000000)).toBe('₹10,000')
  })

  it('shows "₹0" instead of "Free" when asked (totals)', () => {
    expect(formatInr(0, { zero: 'amount' })).toBe('₹0')
    expect(formatInr(0, { zero: 'free' })).toBe('Free')
    expect(formatInr(500, { zero: 'amount' })).toBe('₹5')
  })

  it('formats negative amounts with U+2212', () => {
    expect(formatInr(-50000)).toBe('−₹500')
    expect(formatInr(-150050)).toBe('−₹1,500.50')
    expect(formatInr(-1)).toBe('−₹0.01')
    expect(formatInr(-50000)).not.toContain('-')
  })

  it('handles the largest safe integer without losing precision', () => {
    expect(formatInr(Number.MAX_SAFE_INTEGER)).toBe('₹9,00,71,99,25,47,409.91')
  })

  it('gives an em dash for anything that is not an integer number of paise', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity, 1.5, 0.1, Number.MAX_SAFE_INTEGER + 2, 2 ** 60]) {
      expect(formatInr(bad)).toBe('—')
    }
    expect(formatInr('500' as unknown as number)).toBe('—')
    expect(formatInr(null as unknown as number)).toBe('—')
    expect(formatInr(undefined as unknown as number)).toBe('—')
  })

  it('treats -0 as zero', () => {
    expect(formatInr(-0)).toBe('Free')
  })
})
