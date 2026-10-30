import { describe, expect, it } from 'vitest'
import { flowStepsOf, resolveScreen, slotOf, type ResolveInput } from '@/features/registration/resolve-screen'
import { registrationSchema, registrationStateSchema } from '@/lib/api/types/registration'

const NOW = '2026-10-28T10:00:00.000Z'
const LATER = '2026-10-28T10:15:00.000Z'
const ids = {
  id: '11111111-1111-4111-8111-111111111111',
  eventId: '22222222-2222-4222-8222-222222222222',
  eventSlug: 'spring-open',
  createdAt: NOW,
}
const common = { requiredProfileFields: [], serverNow: NOW }
const priced = { pricePaise: 20000, currency: 'INR' }

function state(value: Record<string, unknown>) {
  return registrationStateSchema.parse({ ...common, ...value })
}
function registration(value: Record<string, unknown>) {
  return registrationSchema.parse({ ...ids, ...value })
}
const paidSummary = { orderState: 'paid', refundState: 'none', amountPaise: 20000, currency: 'INR' }

const openEvent: ResolveInput['event'] = { status: 'registration_open', cancelled: null }

function resolve(
  event: ResolveInput['event'],
  value: ResolveInput['state'],
  session: ResolveInput['session'] = 'signed-in',
) {
  return resolveScreen({ session, event, state: value })
}

describe('resolveScreen: event and session', () => {
  it('shows the cancelled screen before anything else, with the reason', () => {
    const event = { status: 'cancelled', cancelled: { reason: 'Venue closed', cancelledAt: NOW } } as const
    expect(resolve(event, state({ state: 'closed', ...priced }))).toEqual({
      kind: 'event_cancelled',
      reason: 'Venue closed',
    })
    expect(resolve(event, null, 'signed-out').kind).toBe('event_cancelled')
    const registered = state({
      state: 'already_registered',
      ...priced,
      registration: registration({ status: 'confirmed', payment: null }),
    })
    expect(resolve(event, registered).kind).toBe('event_cancelled')
  })

  it('treats a cancelled notice as cancelled even if the status lags', () => {
    const event = { status: 'registration_open', cancelled: { reason: 'Rain', cancelledAt: NOW } } as const
    expect(resolve(event, null, 'signed-out').kind).toBe('event_cancelled')
  })

  it('asks a signed-out visitor to sign in, without needing R01', () => {
    expect(resolve(openEvent, null, 'signed-out')).toEqual({ kind: 'sign_in' })
    expect(resolve(openEvent, null)).toEqual({ kind: 'sign_in' })
  })

  it('says a signed-out visitor cannot register for an event that already started or ended', () => {
    expect(resolve({ status: 'completed', cancelled: null }, null, 'signed-out')).toEqual({
      kind: 'closed',
      ended: true,
    })
  })
})

describe('resolveScreen: R01 states', () => {
  it('maps closed, with ended only for a finished event', () => {
    expect(resolve(openEvent, state({ state: 'closed', ...priced }))).toEqual({ kind: 'closed', ended: false })
    expect(resolve({ status: 'completed', cancelled: null }, state({ state: 'closed', ...priced }))).toEqual({
      kind: 'closed',
      ended: true,
    })
  })

  it('maps not_yet_open with the opening time', () => {
    expect(resolve(openEvent, state({ state: 'not_yet_open', ...priced, opensAt: LATER }))).toEqual({
      kind: 'not_yet_open',
      opensAt: LATER,
    })
  })

  it('splits ineligible into profile_incomplete and not_eligible', () => {
    const incomplete = state({
      state: 'ineligible',
      ...priced,
      reason: 'profile_incomplete',
      requiredProfileFields: ['city', 'phone'],
    })
    expect(resolve(openEvent, incomplete)).toEqual({ kind: 'profile_incomplete', fields: ['city', 'phone'] })
    expect(resolve(openEvent, state({ state: 'ineligible', ...priced, reason: 'age_restricted' }))).toEqual({
      kind: 'not_eligible',
      reason: 'age_restricted',
    })
  })

  it('maps full states to the waitlist screen or sold out', () => {
    expect(resolve(openEvent, state({ state: 'full_waitlist', ...priced, waitlistPosition: 4 }))).toEqual({
      kind: 'waitlist_available',
      slot: 'FE-07',
      position: 4,
    })
    expect(resolve(openEvent, state({ state: 'sold_out', ...priced }))).toEqual({ kind: 'sold_out' })
  })

  it('maps the open states to their slots', () => {
    expect(resolve(openEvent, state({ state: 'open_free', pricePaise: 0, currency: 'INR' }))).toEqual({
      kind: 'open_free',
      slot: 'FE-06',
    })
    expect(resolve(openEvent, state({ state: 'open_paid', ...priced, holdMinutes: 10 }))).toEqual({
      kind: 'open_paid',
      slot: 'FE-08',
      pricePaise: 20000,
      holdMinutes: 10,
    })
  })
})

describe('resolveScreen: already registered', () => {
  const registered = (value: Record<string, unknown>) =>
    state({ state: 'already_registered', ...priced, registration: registration(value) })

  it('confirmed is the registered screen', () => {
    expect(resolve(openEvent, registered({ status: 'confirmed', payment: null })).kind).toBe('registered')
  })

  it('pending is an active hold', () => {
    const screen = resolve(
      openEvent,
      registered({ status: 'pending', holdExpiresAt: LATER, serverNow: NOW, payment: null }),
    )
    expect(screen.kind).toBe('hold_active')
  })

  it('confirming is payment in flight', () => {
    const screen = resolve(
      openEvent,
      registered({ status: 'confirming', holdExpiresAt: LATER, serverNow: NOW, payment: paidSummary }),
    )
    expect(screen.kind).toBe('payment_confirming')
  })

  it('waitlist without an offer is on_waitlist; with an offer it is offer_pending', () => {
    expect(resolve(openEvent, registered({ status: 'waitlist', position: 2, offer: null })).kind).toBe('on_waitlist')
    const screen = resolve(
      openEvent,
      registered({ status: 'waitlist', position: 1, offer: { expiresAt: LATER, serverNow: NOW } }),
    )
    expect(screen).toMatchObject({ kind: 'offer_pending', offerExpiresAt: LATER, serverNow: NOW, pricePaise: 20000 })
  })

  it('never reports a cancelled registration as a place', () => {
    const screen = resolve(openEvent, registered({ status: 'cancelled', cancelledAt: NOW, payment: null }))
    expect(screen.kind).toBe('inactive_registration')
  })
})

describe('slots and steps', () => {
  it('only slot screens have a slot and a step path', () => {
    const closed = resolve(openEvent, state({ state: 'closed', ...priced }))
    expect(slotOf(closed)).toBeNull()
    expect(flowStepsOf(closed)).toBeNull()
    const paid = resolve(openEvent, state({ state: 'open_paid', ...priced, holdMinutes: 10 }))
    expect(slotOf(paid)).toBe('FE-08')
    expect(flowStepsOf(paid)).toMatchObject({ current: 'review' })
    expect(flowStepsOf(paid)?.steps.map((step) => step.id)).toEqual(['review', 'pay', 'done'])
  })

  it('every step path contains its current step', () => {
    const screens = [
      resolve(openEvent, state({ state: 'open_free', pricePaise: 0, currency: 'INR' })),
      resolve(openEvent, state({ state: 'full_waitlist', ...priced, waitlistPosition: 1 })),
      resolve(
        openEvent,
        state({
          state: 'already_registered',
          ...priced,
          registration: registration({ status: 'confirmed', payment: null }),
        }),
      ),
    ]
    for (const screen of screens) {
      const flow = flowStepsOf(screen)
      expect(flow?.steps.some((step) => step.id === flow.current)).toBe(true)
    }
  })
})
