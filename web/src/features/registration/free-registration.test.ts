import { describe, expect, it } from 'vitest'
import {
  availabilityRowText,
  describeFreeFailure,
  firstTimersText,
  isProfileIncomplete,
  reserveFreeInput,
} from '@/features/registration/free-registration'
import { ApiError } from '@/lib/api/errors'
import { availabilitySchema } from '@/lib/api/types/event-state'
import { reserveInputSchema } from '@/lib/api/types/registration'
import { slugSchema } from '@/lib/api/types/primitives'

const NOW = '2026-10-28T10:00:00.000Z'
const err = (code: ConstructorParameters<typeof ApiError>[0], fields?: Record<string, string[]>) =>
  new ApiError(code, { status: 400, fields })

describe('reserveFreeInput', () => {
  it('sends intent only: the slug, no price or currency', () => {
    const input = reserveFreeInput(slugSchema.parse('saturday-social'))
    expect(input).toEqual({ eventSlug: 'saturday-social' })
    expect(reserveInputSchema.safeParse(input).success).toBe(true)
  })
})

describe('describeFreeFailure', () => {
  it('treats ALREADY_REGISTERED as settled (show the server state, not an error)', () => {
    expect(describeFreeFailure(err('ALREADY_REGISTERED')).kind).toBe('settled')
  })
  it.each(['EVENT_FULL', 'REGISTRATION_CLOSED', 'REGISTRATION_NOT_OPEN'] as const)(
    '%s moves to the matching screen',
    (code) => {
      const failure = describeFreeFailure(err(code))
      expect(failure.kind).toBe('moved')
      expect(failure.title.length).toBeGreaterThan(0)
    },
  )
  it('recognises an incomplete profile from the VALIDATION_FAILED profile field', () => {
    const error = err('VALIDATION_FAILED', { profile: ['Complete your profile to register.'] })
    expect(isProfileIncomplete(error)).toBe(true)
    expect(describeFreeFailure(error).kind).toBe('moved')
    expect(isProfileIncomplete(err('VALIDATION_FAILED', { name: ['Required'] }))).toBe(false)
  })
  it('keeps the page and allows a retry for network and server failures', () => {
    expect(describeFreeFailure(err('NETWORK')).kind).toBe('retry')
    expect(describeFreeFailure(err('HTTP_5XX')).kind).toBe('retry')
  })
  it('never shows raw server detail', () => {
    const error = new ApiError('EVENT_FULL', { status: 409, detail: 'secret internal text' })
    const failure = describeFreeFailure(error)
    expect(`${failure.title} ${failure.body}`).not.toContain('secret')
  })
})

describe('availabilityRowText', () => {
  const open = (extra: Record<string, unknown>) =>
    availabilitySchema.parse({ state: 'open', placesLeft: 12, waitlistOpen: false, serverNow: NOW, ...extra })
  it('shows places left for a limited event', () => {
    expect(availabilityRowText(open({}))).toBe('12 places left')
    expect(availabilityRowText(open({ placesLeft: 1 }))).toBe('1 place left')
  })
  it('hides the sentinel count when the event is unlimited', () => {
    const text = availabilityRowText(open({ placesLeft: 100000, unlimited: true }))
    expect(text).toBe('Open to everyone')
    expect(text).not.toMatch(/\d/)
  })
  it('shows nothing while unknown or when the event is not open', () => {
    expect(availabilityRowText(undefined)).toBeNull()
    expect(
      availabilityRowText(
        availabilitySchema.parse({ state: 'closed', placesLeft: 3, waitlistOpen: false, serverNow: NOW }),
      ),
    ).toBeNull()
  })
})

describe('firstTimersText', () => {
  it('reads like the reference', () => {
    expect(firstTimersText(7)).toBe('7 joining')
    expect(firstTimersText(0)).toBe('Be the first')
  })
})
