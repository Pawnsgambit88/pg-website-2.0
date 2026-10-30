import { describe, expect, it } from 'vitest'
import { isAllowedPreviewPath, isOpaqueToken } from './path.ts'

describe('isAllowedPreviewPath', () => {
  it.each(['/', '/community', '/privacy', '/terms', '/refund-policy', '/events/spring-open-2026', '/stories/a1'])(
    'allows %s',
    (path) => {
      expect(isAllowedPreviewPath(path)).toBe(true)
    },
  )

  it.each([
    '',
    '//evil.example',
    '//evil.example/events/x',
    'https://evil.example/',
    'events/x',
    '/\\evil.example',
    '/events',
    '/events/',
    '/events/Bad',
    '/events/a--b',
    '/events/x/y',
    '/events/x?next=//evil',
    '/events/x#frag',
    '/admin',
    '/api/draft',
    '/login',
    '/events/x\n',
    `/events/${'a'.repeat(200)}`,
  ])('rejects %j', (path) => {
    expect(isAllowedPreviewPath(path)).toBe(false)
  })

  it('rejects non-strings', () => {
    for (const value of [undefined, null, 1, {}, ['/']]) expect(isAllowedPreviewPath(value)).toBe(false)
  })
})

describe('isOpaqueToken', () => {
  it('accepts urlsafe tokens of sane length only', () => {
    expect(isOpaqueToken('a'.repeat(43))).toBe(true)
    expect(isOpaqueToken('short')).toBe(false)
    expect(isOpaqueToken('a'.repeat(201))).toBe(false)
    expect(isOpaqueToken(`${'a'.repeat(30)} x`)).toBe(false)
    expect(isOpaqueToken(null)).toBe(false)
  })
})
