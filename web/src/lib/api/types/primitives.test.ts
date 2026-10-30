import { describe, expect, it } from 'vitest'
import {
  ALL_ERROR_CODES,
  TIER_A_CODES,
  TIER_B_CODES,
  TIER_C_CODES,
  errorCodeSchema,
  isKnownErrorCode,
} from '@/lib/api/types/error-codes'
import { failureEnvelopeSchema, successEnvelopeSchema } from '@/lib/api/types/envelope'
import { pageSchema, paginationWireSchema, toPaginationMeta } from '@/lib/api/types/pagination'
import {
  createMediaSrcSchema,
  focalSchema,
  idempotencyKeySchema,
  isInternalPath,
  isSafeHref,
  isoInstantSchema,
  linkHrefSchema,
  mediaSrcSchema,
  paiseSchema,
  parseSlug,
  safeHrefSchema,
  slugSchema,
} from '@/lib/api/types/primitives'
import { z } from 'zod'

describe('slug', () => {
  it.each(['saturday-social', 'a', 'monsoon-open-2026', '2026', 'a1-b2-c3'])('accepts %s', (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    'Saturday-Social',
    'double--hyphen',
    '-lead',
    'trail-',
    'has space',
    'under_score',
    'unicode-é',
    '',
    'a/b',
    '../x',
  ])('rejects %j', (value) => {
    expect(slugSchema.safeParse(value).success).toBe(false)
  })

  it('enforces the 100 character maximum', () => {
    expect(slugSchema.safeParse('a'.repeat(100)).success).toBe(true)
    expect(slugSchema.safeParse('a'.repeat(101)).success).toBe(false)
  })

  it('parseSlug returns null instead of throwing (route params, M13)', () => {
    expect(parseSlug('ok-slug')).toBe('ok-slug')
    expect(parseSlug('Bad Slug')).toBeNull()
  })
})

describe('paise', () => {
  it('accepts zero and positive integers', () => {
    expect(paiseSchema.safeParse(0).success).toBe(true)
    expect(paiseSchema.safeParse(29900).success).toBe(true)
  })
  it.each([-1, 299.5, Number.NaN, Number.POSITIVE_INFINITY, 1e12, '299'])('rejects %j', (value) => {
    expect(paiseSchema.safeParse(value).success).toBe(false)
  })
})

describe('instants', () => {
  it('requires an offset', () => {
    expect(isoInstantSchema.safeParse('2026-10-24T17:00:00+05:30').success).toBe(true)
    expect(isoInstantSchema.safeParse('2026-10-24T17:00:00').success).toBe(false)
    expect(isoInstantSchema.safeParse('24 Oct 2026').success).toBe(false)
  })
})

describe('focal point', () => {
  it('accepts 0..1 inclusive', () => {
    expect(focalSchema.safeParse({ x: 0, y: 1 }).success).toBe(true)
    expect(focalSchema.safeParse({ x: 0.5, y: 0.25 }).success).toBe(true)
  })
  it.each([
    { x: 1.01, y: 0 },
    { x: -0.1, y: 0.5 },
    { x: 0.5, y: 2 },
    { x: Number.NaN, y: 0 },
  ])('rejects %j', (value) => {
    expect(focalSchema.safeParse(value).success).toBe(false)
  })
})

describe('URL refinements', () => {
  it.each(['https://pgchess.in/play', 'http://localhost:3000', 'mailto:hello@pgchess.in', 'tel:+919999999999'])(
    'accepts %s',
    (value) => {
      expect(isSafeHref(value)).toBe(true)
      expect(safeHrefSchema.safeParse(value).success).toBe(true)
    },
  )

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://exa mple.com',
    'java\tscript:alert(1)',
    '//evil.example',
    '/relative',
    '',
  ])('rejects %j as a safe href', (value) => {
    expect(safeHrefSchema.safeParse(value).success).toBe(false)
  })

  it('linkHref also allows same-site paths but not protocol-relative or traversal paths', () => {
    expect(linkHrefSchema.safeParse('/play').success).toBe(true)
    expect(linkHrefSchema.safeParse('/events/saturday-social?ref=home#top').success).toBe(true)
    expect(linkHrefSchema.safeParse('//evil.example').success).toBe(false)
    expect(linkHrefSchema.safeParse('/\\evil.example').success).toBe(false)
    expect(linkHrefSchema.safeParse('/a/../b').success).toBe(false)
    expect(linkHrefSchema.safeParse('javascript:alert(1)').success).toBe(false)
    expect(isInternalPath('play')).toBe(false)
  })
})

describe('media src allow-list policy hook', () => {
  it('accepts local paths and query-less https by default', () => {
    expect(mediaSrcSchema.safeParse('/placeholders/hero.jpg').success).toBe(true)
    expect(mediaSrcSchema.safeParse('https://cdn.pgchess.in/events/a.jpg').success).toBe(true)
  })

  it('rejects http, data, javascript and query strings by default (F-24)', () => {
    expect(mediaSrcSchema.safeParse('http://cdn.pgchess.in/a.jpg').success).toBe(false)
    expect(mediaSrcSchema.safeParse('https://cdn.pgchess.in/a.jpg?w=100').success).toBe(false)
    expect(mediaSrcSchema.safeParse('data:image/png;base64,AAAA').success).toBe(false)
    expect(mediaSrcSchema.safeParse('javascript:alert(1)').success).toBe(false)
  })

  it('lets an adapter inject a host allow-list', () => {
    const schema = createMediaSrcSchema((url) => url.protocol === 'https:' && url.hostname === 'storage.pgchess.in')
    expect(schema.safeParse('https://storage.pgchess.in/a.jpg').success).toBe(true)
    expect(schema.safeParse('https://evil.example/a.jpg').success).toBe(false)
    expect(schema.safeParse('/placeholders/a.jpg').success).toBe(true)
  })
})

describe('idempotency key', () => {
  it('requires a UUID v4', () => {
    expect(idempotencyKeySchema.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(true)
    expect(idempotencyKeySchema.safeParse('not-a-uuid').success).toBe(false)
  })
})

describe('error codes', () => {
  it('has 15 tier A codes and no duplicates across tiers', () => {
    expect(TIER_A_CODES).toHaveLength(15)
    expect(new Set(ALL_ERROR_CODES).size).toBe(TIER_A_CODES.length + TIER_B_CODES.length + TIER_C_CODES.length)
  })
  it('accepts known codes and rejects unknown ones in the enum', () => {
    expect(errorCodeSchema.safeParse('EVENT_FULL').success).toBe(true)
    expect(errorCodeSchema.safeParse('NETWORK').success).toBe(true)
    expect(errorCodeSchema.safeParse('HOLD_EXPIRED').success).toBe(true)
    expect(errorCodeSchema.safeParse('SOMETHING_NEW').success).toBe(false)
    expect(isKnownErrorCode('SOMETHING_NEW')).toBe(false)
  })
})

describe('envelope and pagination', () => {
  const meta = { request_id: 'req-1', timestamp: '2026-10-22T10:00:00+05:30', pagination: null }

  it('parses a success envelope for a payload schema', () => {
    const schema = successEnvelopeSchema(z.object({ ok: z.boolean() }))
    expect(schema.safeParse({ success: true, data: { ok: true }, error: null, meta }).success).toBe(true)
    expect(schema.safeParse({ success: true, data: { ok: 'x' }, error: null, meta }).success).toBe(false)
  })

  it('parses a failure envelope and keeps unknown codes as strings', () => {
    const parsed = failureEnvelopeSchema.safeParse({
      success: false,
      data: null,
      error: { code: 'BRAND_NEW_CODE', detail: 'x', fields: { email: ['Required'] }, retry_after: null },
      meta,
    })
    expect(parsed.success).toBe(true)
  })

  it('uses page numbers and maps snake_case to camelCase', () => {
    const wire = paginationWireSchema.parse({ page: 2, page_size: 20, total: 41, total_pages: 3 })
    expect(toPaginationMeta(wire)).toEqual({ page: 2, pageSize: 20, total: 41, totalPages: 3 })
    expect(paginationWireSchema.safeParse({ page: 0, page_size: 20, total: 0, total_pages: 0 }).success).toBe(false)
  })

  it('page schema wraps items and pagination', () => {
    const schema = pageSchema(z.string())
    expect(
      schema.safeParse({ items: ['a'], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }).success,
    ).toBe(true)
    expect(schema.safeParse({ items: ['a'], next: 'https://x' }).success).toBe(false)
  })
})
