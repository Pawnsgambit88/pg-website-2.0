import { describe, expect, it } from 'vitest'
import { formatOrdinal, formatRatingDelta } from '@/lib/format/rating'

describe('formatRatingDelta', () => {
  it('signs positive, negative (U+2212) and zero', () => {
    expect(formatRatingDelta(12)).toBe('+12')
    expect(formatRatingDelta(-8)).toBe('−8')
    expect(formatRatingDelta(-8)).not.toContain('-')
    expect(formatRatingDelta(0)).toBe('0')
    expect(formatRatingDelta(-0)).toBe('0')
    expect(formatRatingDelta(-1234)).toBe('−1234')
  })

  it('gives an em dash for non-integers', () => {
    for (const bad of [Number.NaN, Infinity, 1.5, -0.5]) expect(formatRatingDelta(bad)).toBe('—')
    expect(formatRatingDelta('3' as unknown as number)).toBe('—')
  })
})

describe('formatOrdinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [10, '10th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [14, '14th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [100, '100th'],
    [101, '101st'],
    [111, '111th'],
    [112, '112th'],
    [113, '113th'],
    [121, '121st'],
  ])('%i -> %s', (position, expected) => {
    expect(formatOrdinal(position)).toBe(expected)
  })

  it('gives an em dash for zero, negatives and non-integers', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Infinity]) expect(formatOrdinal(bad)).toBe('—')
  })
})
