import { describe, expect, it } from 'vitest'
import {
  authResultWireSchema,
  loginInputSchema,
  meSchema,
  oauthStartSchema,
  refreshInputSchema,
  registerInputSchema,
  sessionTokensSchema,
  tokenCookieBodySchema,
  tokenPairBodySchema,
} from '@/lib/api/types/auth'
import { eventRoomSnapshotSchema, submitResultInputSchema } from '@/lib/api/types/event-room'
import { createOrderInputSchema, paymentOrderSchema, verifyPaymentInputSchema } from '@/lib/api/types/payment'
import { profileUpdateSchema, publicIdentityUpdateSchema } from '@/lib/api/types/profile'
import { ledgerEntrySchema, ratingProfileSchema } from '@/lib/api/types/rating'
import {
  REGISTRATION_STATUSES,
  registrationSchema,
  registrationStateSchema,
  reserveInputSchema,
  reserveResultSchema,
} from '@/lib/api/types/registration'
import { myRegistrationSchema } from '@/lib/api/types/my-events'

const NOW = '2026-10-22T10:00:00+05:30'
const LATER = '2026-10-22T10:10:00+05:30'
const ID = '11111111-1111-4111-8111-111111111111'
const ID2 = '22222222-2222-4222-8222-222222222222'

const me = {
  id: ID,
  name: 'Kiran Rao',
  email: 'kiran@example.com',
  role: 'player',
  profileComplete: true,
  onboardingDone: true,
  city: 'Hyderabad',
  ratings: [{ pool: 'rapid', rating: 1286, games: 27, provisional: false }],
}

describe('auth', () => {
  it('accepts me and rejects an unknown role', () => {
    expect(meSchema.safeParse(me).success).toBe(true)
    expect(meSchema.safeParse({ ...me, role: 'superuser' }).success).toBe(false)
    expect(meSchema.safeParse({ ...me, role: 'host' }).success).toBe(false)
  })

  it('body mode carries both tokens; cookie mode carries only the access token', () => {
    expect(tokenPairBodySchema.safeParse({ accessToken: 'a', refreshToken: 'r' }).success).toBe(true)
    expect(tokenPairBodySchema.safeParse({ accessToken: 'a' }).success).toBe(false)
    expect(tokenCookieBodySchema.safeParse({ accessToken: 'a' }).success).toBe(true)
    expect(tokenCookieBodySchema.safeParse({ accessToken: 'a', refreshToken: 'r' }).success).toBe(false)
    expect(sessionTokensSchema.safeParse({ accessToken: 'a', refreshToken: 'r' }).success).toBe(true)
    expect(sessionTokensSchema.safeParse({ accessToken: 'a' }).success).toBe(true)
    expect(sessionTokensSchema.safeParse({ refreshToken: 'r' }).success).toBe(false)
  })

  it('login/register wire responses accept both modes', () => {
    expect(authResultWireSchema.safeParse({ user: me, accessToken: 'a', refreshToken: 'r' }).success).toBe(true)
    expect(authResultWireSchema.safeParse({ user: me, accessToken: 'a' }).success).toBe(true)
    expect(authResultWireSchema.safeParse({ user: me }).success).toBe(false)
  })

  it('refresh input: body mode sends the token, cookie mode sends nothing', () => {
    expect(refreshInputSchema.safeParse({ refreshToken: 'r' }).success).toBe(true)
    expect(refreshInputSchema.safeParse({}).success).toBe(true)
    expect(refreshInputSchema.safeParse({ refreshToken: '' }).success).toBe(false)
  })

  it('validates credentials and rejects weak or malformed input client-side', () => {
    expect(loginInputSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(loginInputSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
    expect(registerInputSchema.safeParse({ name: 'Kiran', email: 'a@b.co', password: 'short' }).success).toBe(false)
    expect(
      registerInputSchema.safeParse({ name: 'Kiran', email: 'a@b.co', password: 'long-enough-pass' }).success,
    ).toBe(true)
  })

  it('OAuth start must be an absolute https URL', () => {
    expect(oauthStartSchema.safeParse({ url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' }).success).toBe(true)
    expect(oauthStartSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
    expect(oauthStartSchema.safeParse({ url: 'http://accounts.google.com' }).success).toBe(false)
    expect(oauthStartSchema.safeParse({ url: '/relative' }).success).toBe(false)
  })
})

const payment = { orderState: 'paid', refundState: 'none', amountPaise: 29900, currency: 'INR' }
const base = { id: ID, eventId: ID2, eventSlug: 'saturday-social', createdAt: NOW }

describe('registration', () => {
  it('accepts every status in its coherent shape', () => {
    const shapes = [
      { ...base, status: 'pending', holdExpiresAt: LATER, serverNow: NOW, payment: null },
      { ...base, status: 'confirming', holdExpiresAt: LATER, serverNow: NOW, payment },
      { ...base, status: 'confirmed', payment },
      { ...base, status: 'waitlist', position: 4, offer: null },
      { ...base, status: 'cancelled', cancelledAt: NOW, payment: null },
      {
        ...base,
        status: 'refunded',
        refundedAt: NOW,
        payment: { ...payment, orderState: 'refunded', refundState: 'refunded' },
      },
    ]
    for (const shape of shapes) expect(registrationSchema.safeParse(shape).success).toBe(true)
    expect(new Set(shapes.map((s) => s.status))).toEqual(new Set(REGISTRATION_STATUSES))
  })

  it('makes illegal states unrepresentable', () => {
    // pending without a hold expiry
    expect(registrationSchema.safeParse({ ...base, status: 'pending', payment: null }).success).toBe(false)
    // waitlist without a position
    expect(registrationSchema.safeParse({ ...base, status: 'waitlist', offer: null }).success).toBe(false)
    // refunded without a payment
    expect(registrationSchema.safeParse({ ...base, status: 'refunded', refundedAt: NOW, payment: null }).success).toBe(
      false,
    )
    // unknown status
    expect(registrationSchema.safeParse({ ...base, status: 'paid' }).success).toBe(false)
  })

  it('state resolver covers the eight server states and enforces price coherence', () => {
    const common = { requiredProfileFields: ['phone'], serverNow: NOW }
    const priced = { pricePaise: 29900, currency: 'INR' }
    expect(
      registrationStateSchema.safeParse({ ...common, state: 'open_free', pricePaise: 0, currency: 'INR' }).success,
    ).toBe(true)
    expect(
      registrationStateSchema.safeParse({ ...common, state: 'open_free', pricePaise: 100, currency: 'INR' }).success,
    ).toBe(false)
    expect(
      registrationStateSchema.safeParse({ ...common, ...priced, state: 'open_paid', holdMinutes: 10 }).success,
    ).toBe(true)
    expect(
      registrationStateSchema.safeParse({
        ...common,
        state: 'open_paid',
        pricePaise: 0,
        currency: 'INR',
        holdMinutes: 10,
      }).success,
    ).toBe(false)
    expect(
      registrationStateSchema.safeParse({ ...common, ...priced, state: 'full_waitlist', waitlistPosition: 4 }).success,
    ).toBe(true)
    expect(registrationStateSchema.safeParse({ ...common, ...priced, state: 'sold_out' }).success).toBe(true)
    expect(registrationStateSchema.safeParse({ ...common, ...priced, state: 'closed' }).success).toBe(true)
    expect(
      registrationStateSchema.safeParse({ ...common, ...priced, state: 'not_yet_open', opensAt: LATER }).success,
    ).toBe(true)
    expect(
      registrationStateSchema.safeParse({ ...common, ...priced, state: 'ineligible', reason: 'profile_incomplete' })
        .success,
    ).toBe(true)
    expect(
      registrationStateSchema.safeParse({
        ...common,
        ...priced,
        state: 'already_registered',
        registration: { ...base, status: 'confirmed', payment },
      }).success,
    ).toBe(true)
    expect(
      registrationStateSchema.safeParse({ ...common, ...priced, state: 'ineligible', reason: 'because' }).success,
    ).toBe(false)
    expect(registrationStateSchema.safeParse({ ...common, ...priced, state: 'mystery' }).success).toBe(false)
  })

  it('the reserve request carries intent only: no price, amount or currency', () => {
    expect(reserveInputSchema.safeParse({ eventSlug: 'saturday-social' }).success).toBe(true)
    expect(reserveInputSchema.safeParse({ eventSlug: 'saturday-social', pricePaise: 1 }).success).toBe(false)
    expect(reserveInputSchema.safeParse({ eventSlug: 'saturday-social', currency: 'INR' }).success).toBe(false)
    expect(reserveInputSchema.safeParse({ eventSlug: 'Bad Slug' }).success).toBe(false)
  })

  it('reserve result keeps the registration status consistent with the result status', () => {
    const confirmed = { ...base, status: 'confirmed', payment: null }
    const pending = { ...base, status: 'pending', holdExpiresAt: LATER, serverNow: NOW, payment: null }
    expect(reserveResultSchema.safeParse({ status: 'confirmed', registration: confirmed }).success).toBe(true)
    expect(reserveResultSchema.safeParse({ status: 'confirmed', registration: pending }).success).toBe(false)
    expect(
      reserveResultSchema.safeParse({ status: 'pending', registration: pending, holdExpiresAt: LATER, serverNow: NOW })
        .success,
    ).toBe(true)
  })

  it('my events row requires server-computed cancel and room flags', () => {
    const row = {
      registration: { ...base, status: 'confirmed', payment: null },
      event: {
        id: ID2,
        slug: 'saturday-social',
        title: 'Saturday Social',
        startsAt: NOW,
        area: 'Jubilee Hills',
        status: 'registration_open',
        cover: null,
      },
      canCancel: true,
      cancelBlockedReason: null,
      canOpenRoom: true,
    }
    expect(myRegistrationSchema.safeParse(row).success).toBe(true)
    const missing = { ...row, canCancel: undefined }
    expect(myRegistrationSchema.safeParse(missing).success).toBe(false)
  })
})

describe('payment', () => {
  const order = {
    orderId: 'order_Abc123Def456',
    amountPaise: 29900,
    currency: 'INR',
    keyId: 'rzp_test_AbCdEf123456',
    holdExpiresAt: LATER,
    serverNow: NOW,
  }
  it('accepts a server order and rejects a wrong currency, fractional amount or secret-looking key', () => {
    expect(paymentOrderSchema.safeParse(order).success).toBe(true)
    expect(paymentOrderSchema.safeParse({ ...order, currency: 'USD' }).success).toBe(false)
    expect(paymentOrderSchema.safeParse({ ...order, amountPaise: 299.5 }).success).toBe(false)
    expect(paymentOrderSchema.safeParse({ ...order, amountPaise: -1 }).success).toBe(false)
    expect(paymentOrderSchema.safeParse({ ...order, keyId: 'not-a-key' }).success).toBe(false)
  })
  it('create-order input is the registration id only', () => {
    expect(createOrderInputSchema.safeParse({ registrationId: ID }).success).toBe(true)
    expect(createOrderInputSchema.parse({ registrationId: ID, amountPaise: 1 })).toEqual({ registrationId: ID })
  })
  it('verify input uses the Razorpay field names and a hex signature', () => {
    const verify = {
      razorpay_order_id: 'order_Abc123Def456',
      razorpay_payment_id: 'pay_Abc123Def456',
      razorpay_signature: 'a'.repeat(64),
    }
    expect(verifyPaymentInputSchema.safeParse(verify).success).toBe(true)
    expect(verifyPaymentInputSchema.safeParse({ ...verify, razorpay_signature: 'zz' }).success).toBe(false)
    expect(verifyPaymentInputSchema.safeParse({ ...verify, razorpay_payment_id: 'x' }).success).toBe(false)
  })
})

describe('event room', () => {
  const identity = {
    displayName: 'Aarav Menon',
    initials: 'AM',
    rating: { pool: 'rapid', value: 1318 },
    cityChapter: null,
  }
  const roomBase = {
    eventId: ID,
    eventSlug: 'beginner-circle',
    title: 'Beginner Circle',
    venue: 'The Courtyard, Banjara Hills',
    startsAt: NOW,
    serverNow: NOW,
    version: 5,
    checkIn: { status: 'checked_in', at: NOW },
    capabilities: {
      canCheckIn: false,
      canSubmitResult: true,
      canConfirmResult: false,
      canDispute: true,
      canContactHost: true,
    },
    result: { state: 'none' },
    disabledReasons: { canCheckIn: 'You are already checked in.' },
  }
  const pairing = { pairingId: ID2, round: 3, board: 7, colour: 'white', opponent: identity, timeControl: '10+3' }

  it('accepts each of the six room states', () => {
    const complete = {
      ...roomBase,
      roomState: 'complete',
      score: { points: 3, roundsPlayed: 4, place: 5 },
      standings: [],
      ratingProcessing: { status: 'complete', pool: 'rapid', before: 1265, after: 1286, delta: 21 },
    }
    const shapes = [
      { ...roomBase, roomState: 'before_checkin', checkIn: { status: 'not_open', opensAt: LATER } },
      { ...roomBase, roomState: 'checkin_open', checkIn: { status: 'open', closesAt: null } },
      { ...roomBase, roomState: 'pairing_pending' },
      { ...roomBase, roomState: 'live_round', roundState: 'live', pairing, bye: null, standings: [] },
      {
        ...roomBase,
        roomState: 'between_rounds',
        score: { points: 1.5, roundsPlayed: 2, place: 8 },
        standings: [],
        nextRoundAt: null,
      },
      complete,
    ]
    for (const shape of shapes) expect(eventRoomSnapshotSchema.safeParse(shape).success).toBe(true)
  })

  it('covers manual check-in, awaiting confirmation and pending rating processing', () => {
    expect(
      eventRoomSnapshotSchema.safeParse({
        ...roomBase,
        roomState: 'pairing_pending',
        checkIn: { status: 'manual_required', reason: 'See the host desk.' },
      }).success,
    ).toBe(true)
    expect(
      eventRoomSnapshotSchema.safeParse({
        ...roomBase,
        roomState: 'live_round',
        roundState: 'live',
        pairing,
        bye: null,
        standings: [],
        result: { state: 'awaiting_confirmation', submittedBy: 'opponent' },
      }).success,
    ).toBe(true)
    expect(
      eventRoomSnapshotSchema.safeParse({
        ...roomBase,
        roomState: 'complete',
        score: { points: 3, roundsPlayed: 4, place: null },
        standings: [],
        ratingProcessing: { status: 'pending' },
      }).success,
    ).toBe(true)
  })

  it('rejects unknown room state, bad colour, missing capability flag and a result state outside the machine', () => {
    expect(eventRoomSnapshotSchema.safeParse({ ...roomBase, roomState: 'lobby' }).success).toBe(false)
    expect(
      eventRoomSnapshotSchema.safeParse({
        ...roomBase,
        roomState: 'live_round',
        roundState: 'live',
        pairing: { ...pairing, colour: 'red' },
        bye: null,
        standings: [],
      }).success,
    ).toBe(false)
    const fewer = { ...roomBase.capabilities, canDispute: undefined }
    expect(
      eventRoomSnapshotSchema.safeParse({ ...roomBase, roomState: 'pairing_pending', capabilities: fewer }).success,
    ).toBe(false)
    expect(
      eventRoomSnapshotSchema.safeParse({ ...roomBase, roomState: 'pairing_pending', result: { state: 'maybe' } })
        .success,
    ).toBe(false)
    // a draft round is never visible to players
    expect(
      eventRoomSnapshotSchema.safeParse({
        ...roomBase,
        roomState: 'live_round',
        roundState: 'draft',
        pairing,
        bye: null,
        standings: [],
      }).success,
    ).toBe(false)
  })

  it('public identity in the room carries no contact fields', () => {
    const parsed = eventRoomSnapshotSchema.parse({
      ...roomBase,
      roomState: 'live_round',
      roundState: 'live',
      pairing: { ...pairing, opponent: { ...identity, email: 'a@b.co', phone: '123' } },
      bye: null,
      standings: [],
    })
    expect(JSON.stringify(parsed)).not.toMatch(/a@b\.co|"phone"/)
  })

  it('submit result is strict: pairing id and outcome only', () => {
    expect(submitResultInputSchema.safeParse({ pairingId: ID, outcome: 'draw' }).success).toBe(true)
    expect(submitResultInputSchema.safeParse({ pairingId: ID, outcome: 'win' }).success).toBe(false)
    expect(submitResultInputSchema.safeParse({ pairingId: ID, outcome: 'white', score: 1 }).success).toBe(false)
  })
})

describe('ratings', () => {
  const unrated = (pool: string) => ({ pool, state: 'unrated', games: 0 })
  it('accepts three pools including empty and provisional', () => {
    const profile = {
      blitz: unrated('blitz'),
      rapid: { pool: 'rapid', state: 'provisional', rating: 1286, rd: 180, games: 3, lastChange: 12 },
      classical: { pool: 'classical', state: 'established', rating: 1342, rd: 71, games: 27, lastChange: null },
    }
    expect(ratingProfileSchema.safeParse(profile).success).toBe(true)
  })
  it('rejects a pool in the wrong slot, an unknown pool and volatility as a leaked field', () => {
    expect(
      ratingProfileSchema.safeParse({
        blitz: unrated('rapid'),
        rapid: unrated('rapid'),
        classical: unrated('classical'),
      }).success,
    ).toBe(false)
    expect(unrated('bullet')).toBeDefined()
    expect(
      ratingProfileSchema.safeParse({
        blitz: unrated('bullet'),
        rapid: unrated('rapid'),
        classical: unrated('classical'),
      }).success,
    ).toBe(false)
  })
  it('ledger entries carry before, after, delta and a public opponent only', () => {
    const entry = {
      id: ID,
      pool: 'rapid',
      at: NOW,
      outcome: 'win',
      opponent: { displayName: 'Ananya Shah', initials: 'AS' },
      before: 1268,
      after: 1286,
      delta: 18,
      event: { slug: 'saturday-social', title: 'Saturday Social' },
    }
    expect(ledgerEntrySchema.safeParse(entry).success).toBe(true)
    expect(ledgerEntrySchema.safeParse({ ...entry, outcome: 'bye' }).success).toBe(false)
    expect(ledgerEntrySchema.safeParse({ ...entry, delta: 18.5 }).success).toBe(false)
  })
})

describe('profile', () => {
  it('profile update is strict: no role, email or ratings', () => {
    expect(profileUpdateSchema.safeParse({ city: 'Hyderabad' }).success).toBe(true)
    expect(profileUpdateSchema.safeParse({ role: 'admin' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ email: 'x@y.co' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ rating: 3000 }).success).toBe(false)
  })
  it('public identity flags cannot include email, phone or birthday', () => {
    expect(publicIdentityUpdateSchema.safeParse({ showRatings: false }).success).toBe(true)
    expect(publicIdentityUpdateSchema.safeParse({ showEmail: true }).success).toBe(false)
    expect(publicIdentityUpdateSchema.safeParse({ showPhone: true }).success).toBe(false)
    expect(publicIdentityUpdateSchema.safeParse({ showBirthday: true }).success).toBe(false)
  })
})
