import { describe, expect, it } from 'vitest'
import { isAdminEventTab, isValidEntityId, isValidSlug } from './params.ts'

describe('route param validation (ARCH-001 M13)', () => {
  it('accepts kebab-case slugs and rejects everything else', () => {
    expect(isValidSlug('spring-open-2026')).toBe(true)
    for (const bad of ['', 'Spring', 'a--b', '-a', 'a-', 'a_b', 'a/b', '..', '%2e%2e', 'a b', 'x'.repeat(101)]) {
      expect(isValidSlug(bad), bad).toBe(false)
    }
    expect(isValidSlug('x'.repeat(100))).toBe(true)
  })

  it('accepts url-safe ids and rejects traversal and oversize values', () => {
    expect(isValidEntityId('8f14e45f-ceea-467a-9575-1a2b3c4d5e6f')).toBe(true)
    for (const bad of ['', '../x', 'a/b', '%2e', 'a b', 'x'.repeat(65)]) expect(isValidEntityId(bad), bad).toBe(false)
  })

  it('accepts only the eight Control Room tabs', () => {
    expect(isAdminEventTab('check-in')).toBe(true)
    expect(isAdminEventTab('edit')).toBe(false)
    expect(isAdminEventTab('')).toBe(false)
  })
})
