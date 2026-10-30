import { describe, expect, it } from 'vitest'
import {
  countdownLabel,
  describeWaitlistFailure,
  formatCountdown,
  joinWaitlistInput,
  offerIsFree,
  remainingMs,
} from '@/features/registration/waitlist'
import { ApiError } from '@/lib/api/errors'
import { slugSchema } from '@/lib/api/types/primitives'
import { joinWaitlistInputSchema } from '@/lib/api/types/registration'

const err = (code: ConstructorParameters<typeof ApiError>[0], fields?: Record<string, string[]>) =>
  new ApiError(code, { status: 409, fields })

describe('joinWaitlistInput', () => {
  it('sends the slug only', () => {
    const input = joinWaitlistInput(slugSchema.parse('saturday-social'))
    expect(input).toEqual({ eventSlug: 'saturday-social' })
    expect(joinWaitlistInputSchema.safeParse(input).success).toBe(true)
  })
})

describe('describeWaitlistFailure', () => {
  it('reads HOLD_EXPIRED on accept as an expired offer', () => {
    const failure = describeWaitlistFailure(err('HOLD_EXPIRED'), 'accept')
    expect(failure.kind).toBe('expired')
    expect(failure.body).toMatch(/nothing was charged/i)
  })
  it('does not call HOLD_EXPIRED an offer on other actions', () => {
    expect(describeWaitlistFailure(err('HOLD_EXPIRED'), 'leave').kind).toBe('retry')
  })
  it('treats ALREADY_REGISTERED as settled', () => {
    expect(describeWaitlistFailure(err('ALREADY_REGISTERED'), 'join').kind).toBe('settled')
    expect(describeWaitlistFailure(err('ALREADY_REGISTERED'), 'accept').kind).toBe('settled')
  })
  it('treats "places are available" on join as moved', () => {
    const failure = describeWaitlistFailure(
      err('VALIDATION_FAILED', { eventSlug: ['Places are still available.'] }),
      'join',
    )
    expect(failure.kind).toBe('moved')
  })
  it.each(['EVENT_FULL', 'REGISTRATION_CLOSED', 'REGISTRATION_NOT_OPEN'] as const)('treats %s as moved', (code) => {
    expect(describeWaitlistFailure(err(code), 'accept').kind).toBe('moved')
  })
  it('keeps the page for a transient failure so the player can retry', () => {
    expect(describeWaitlistFailure(new ApiError('BAD_RESPONSE', { status: 0 }), 'join').kind).toBe('retry')
  })
})

describe('remainingMs (no client-clock trust)', () => {
  const expiresAt = '2026-10-29T10:30:00.000Z'
  const serverNow = '2026-10-29T10:00:00.000Z'
  it('is the server gap minus time the browser has held the response', () => {
    expect(remainingMs(expiresAt, serverNow, 0)).toBe(30 * 60_000)
    expect(remainingMs(expiresAt, serverNow, 5_000)).toBe(30 * 60_000 - 5_000)
  })
  it('never goes negative and treats unreadable input as expired', () => {
    expect(remainingMs(expiresAt, serverNow, 99 * 60_000)).toBe(0)
    expect(remainingMs('nope', serverNow, 0)).toBe(0)
    expect(remainingMs(expiresAt, 'nope', 0)).toBe(0)
  })
  it('ignores a negative elapsed value (a monotonic clock cannot run backwards)', () => {
    expect(remainingMs(expiresAt, serverNow, -10_000)).toBe(30 * 60_000)
  })
})

describe('countdown text', () => {
  it('formats minutes and seconds, rounding up so 0:00 means really over', () => {
    expect(formatCountdown(29 * 60_000 + 5_000)).toBe('29:05')
    expect(formatCountdown(500)).toBe('0:01')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(3_723_000)).toBe('1:02:03')
  })
  it('words it for screen readers', () => {
    expect(countdownLabel(65_000)).toBe('1 minute 5 seconds')
    expect(countdownLabel(120_000)).toBe('2 minutes')
    expect(countdownLabel(1_000)).toBe('1 second')
  })
})

describe('offerIsFree', () => {
  it('is free only at 0 paise', () => {
    expect(offerIsFree(0)).toBe(true)
    expect(offerIsFree(20000)).toBe(false)
  })
})
