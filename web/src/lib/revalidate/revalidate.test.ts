import { describe, expect, it } from 'vitest'
import { tagsToExpire } from './mapping.ts'
import { parsePayload } from './payload.ts'
import { computeSignature, isValidEventId, verifySignature } from './signature.ts'
import { isWithinWindow } from './timestamp.ts'

// Golden vector produced by backend/content/revalidation.py `sign()` (same algorithm, dummy secret).
const SECRET = 'unit-test-secret-not-real-0123456789'
const TS = '1700000000'
const EVENT_ID = '0b7c1f9e-2f3a-4a52-9d55-5a1c3c0c2e11'
const BODY = new TextEncoder().encode(
  '{"type":"site","action":"updated","id":"footer","occurredAt":"2026-10-28T01:00:00+05:30","version":3}',
)

describe('signature', () => {
  const good = computeSignature(SECRET, TS, EVENT_ID, BODY)

  it('accepts the signing string timestamp.eventId.rawBody', () => {
    expect(good).toMatch(/^v1=[0-9a-f]{64}$/)
    expect(verifySignature([SECRET], TS, EVENT_ID, BODY, good)).toBe(true)
  })

  it('accepts the previous secret during rotation', () => {
    expect(verifySignature(['new-secret', SECRET], TS, EVENT_ID, BODY, good)).toBe(true)
  })

  it('rejects a tampered body, timestamp, event id or secret', () => {
    expect(verifySignature([SECRET], TS, EVENT_ID, new TextEncoder().encode('{}'), good)).toBe(false)
    expect(verifySignature([SECRET], '1700000001', EVENT_ID, BODY, good)).toBe(false)
    expect(verifySignature([SECRET], TS, '0b7c1f9e-2f3a-4a52-9d55-5a1c3c0c2e12', BODY, good)).toBe(false)
    expect(verifySignature(['other-secret'], TS, EVENT_ID, BODY, good)).toBe(false)
  })

  it('rejects malformed headers without throwing', () => {
    for (const header of [null, '', 'v1=abc', good.toUpperCase(), good.slice(3), `v2=${good.slice(3)}`]) {
      expect(verifySignature([SECRET], TS, EVENT_ID, BODY, header)).toBe(false)
    }
  })

  it('validates the event id shape', () => {
    expect(isValidEventId(EVENT_ID)).toBe(true)
    expect(isValidEventId('a.b')).toBe(false)
    expect(isValidEventId(null)).toBe(false)
  })

  it('enforces the 300 s past window and 60 s future skew', () => {
    expect(isWithinWindow(1000, 1300)).toBe(true)
    expect(isWithinWindow(1000, 1301)).toBe(false)
    expect(isWithinWindow(1060, 1000)).toBe(true)
    expect(isWithinWindow(1061, 1000)).toBe(false)
  })
})

const at = '2026-10-28T01:00:00+05:30'
const body = (extra: Record<string, unknown>): string => JSON.stringify({ occurredAt: at, version: 1, ...extra })

describe('payload + mapping for every backend emitter', () => {
  it('maps event, story, testimonial, legal, site and media', () => {
    const event = parsePayload(body({ type: 'event', action: 'updated', id: EVENT_ID, slug: 'spring-open' }))
    expect(event && tagsToExpire(event)).toEqual(
      expect.arrayContaining(['event:spring-open', 'events', 'past-events', 'site:home', 'sitemap']),
    )
    const story = parsePayload(body({ type: 'story', action: 'published', id: EVENT_ID, slug: 'a-story' }))
    expect(story && tagsToExpire(story)).toEqual(expect.arrayContaining(['story:a-story', 'stories']))
    const testimonial = parsePayload(body({ type: 'testimonial', action: 'deleted', id: EVENT_ID }))
    expect(testimonial && tagsToExpire(testimonial)).toEqual(expect.arrayContaining(['testimonials']))
    const legal = parsePayload(body({ type: 'legal', action: 'updated', id: 'refund-policy' }))
    expect(legal && tagsToExpire(legal)).toEqual(['legal:refund-policy', 'sitemap'])
    const media = parsePayload(body({ type: 'media', action: 'updated', id: EVENT_ID }))
    expect(media && tagsToExpire(media)).toEqual(expect.arrayContaining(['events', 'stories', 'site:footer']))
  })

  it.each(['meta', 'footer'])('maps brand settings site/%s to its own tag', (key) => {
    const parsed = parsePayload(body({ type: 'site', action: 'updated', id: key }))
    expect(parsed && tagsToExpire(parsed)).toEqual([`site:${key}`])
  })

  it('accepts player and result and expires the lists that can show them', () => {
    for (const [type, action] of [
      ['player', 'deleted'],
      ['player', 'privacy_updated'],
      ['player', 'emergency_purge'],
      ['result', 'deleted'],
    ] as const) {
      const parsed = parsePayload(body({ type, action, id: EVENT_ID }))
      expect(parsed).toBeDefined()
      expect(parsed && tagsToExpire(parsed)).toEqual(expect.arrayContaining(['events', 'past-events', 'stories']))
    }
  })

  it('rejects invalid pairs, unknown fields and bad slugs', () => {
    expect(parsePayload(body({ type: 'player', action: 'updated', id: EVENT_ID }))).toBeUndefined()
    expect(parsePayload(body({ type: 'story', action: 'cancelled', id: EVENT_ID, slug: 'x' }))).toBeUndefined()
    expect(parsePayload(body({ type: 'result', action: 'privacy_updated', id: EVENT_ID }))).toBeUndefined()
    expect(parsePayload(body({ type: 'media', action: 'updated', id: EVENT_ID, extra: 1 }))).toBeUndefined()
    expect(parsePayload(body({ type: 'event', action: 'updated', id: EVENT_ID, slug: 'Bad Slug' }))).toBeUndefined()
    expect(parsePayload(body({ type: 'event', action: 'updated', id: EVENT_ID }))).toBeUndefined()
  })
})
