import { ApiError } from '@/lib/api/errors'
import type { RegistrationDto } from '@/lib/api/types/registration'
import { toIso, type PlayerContext } from '@/lib/mock/player/context'
import { eventRefBySlug, type MockEventRef } from '@/lib/mock/seeds/player-events'
import { HOLD_MINUTES, MOCK_REGISTRATIONS, REGISTRATION_IDS, paidSummary } from '@/lib/mock/seeds/player-registrations'

// The player's registrations as the API shows them: seeds (demo only) with session changes laid over them, the forced
// `reg:<status>` scenario applied, and hold clocks counting from now. Shared by registrations.ts and room.ts.

export const ACTIVE: ReadonlySet<RegistrationDto['status']> = new Set([
  'pending',
  'confirming',
  'confirmed',
  'waitlist',
])

export function ref(slug: string): MockEventRef {
  const found = eventRefBySlug(slug)
  if (found === undefined) throw new ApiError('EVENT_NOT_FOUND', { status: 404 })
  return found
}

/** `?mock=reg:<status>` rewrites the demo player's Beginner Circle registration. */
function forceStatus(reg: RegistrationDto, ctx: PlayerContext): RegistrationDto {
  const forced = ctx.state.scenario.reg
  if (forced === undefined || reg.id !== REGISTRATION_IDS.beginnerCircle) return reg
  const base = { id: reg.id, eventId: reg.eventId, eventSlug: reg.eventSlug, createdAt: reg.createdAt }
  const nowIso = toIso(ctx.nowMs)
  const hold = { holdExpiresAt: toIso(ctx.nowMs + HOLD_MINUTES * 60_000), serverNow: nowIso }
  const price = ref(reg.eventSlug).pricePaise
  const order = (orderState: 'created' | 'attempted' | 'paid') => ({
    orderState,
    refundState: 'none' as const,
    amountPaise: price,
    currency: 'INR' as const,
  })
  switch (forced) {
    case 'pending':
      return { ...base, status: 'pending', ...hold, payment: order('created') }
    case 'confirming':
      return { ...base, status: 'confirming', ...hold, payment: order('attempted') }
    case 'confirmed':
      return { ...base, status: 'confirmed', payment: paidSummary(price) }
    case 'waitlist':
      return { ...base, status: 'waitlist', position: 2, offer: null }
    case 'offer':
      return {
        ...base,
        status: 'waitlist',
        position: 1,
        offer: { expiresAt: toIso(ctx.nowMs + 30 * 60_000), serverNow: nowIso },
      }
    case 'cancelled':
      return {
        ...base,
        status: 'cancelled',
        cancelledAt: nowIso,
        payment: { orderState: 'paid', refundState: 'pending', amountPaise: price, currency: 'INR' },
      }
    case 'refunded':
      return {
        ...base,
        status: 'refunded',
        refundedAt: nowIso,
        payment: { orderState: 'refunded', refundState: 'refunded', amountPaise: price, currency: 'INR' },
      }
    default:
      return reg
  }
}

/** Live clocks: a pending hold counts down from now, never from the fixed seed clock. */
function fresh(reg: RegistrationDto, ctx: PlayerContext): RegistrationDto {
  if (reg.status === 'pending' || reg.status === 'confirming') {
    const seeded = reg.id === REGISTRATION_IDS.coffeehouseRapid
    return {
      ...reg,
      serverNow: toIso(ctx.nowMs),
      ...(seeded ? { holdExpiresAt: toIso(ctx.nowMs + (HOLD_MINUTES - 1) * 60_000) } : {}),
    }
  }
  if (reg.status === 'waitlist' && reg.offer !== null) {
    return { ...reg, offer: { ...reg.offer, serverNow: toIso(ctx.nowMs) } }
  }
  return reg
}

/** The player's registrations: seeds (demo only) with session changes laid over them. */
export function registrationsOf(ctx: PlayerContext): RegistrationDto[] {
  const own = ctx.state.regs.filter((entry) => entry.accountId === ctx.account.id).map((entry) => entry.registration)
  const seeds = ctx.isDemo ? MOCK_REGISTRATIONS.filter((seed) => !own.some((item) => item.id === seed.id)) : []
  return [...seeds, ...own].map((reg) => fresh(forceStatus(reg, ctx), ctx))
}

/** Runs one call with the bearer (session bridge, refresh-and-replay): see auth/player-api.ts `createBearerRunner`. */
export type Bearer = <T>(
  opts: { signal?: AbortSignal | undefined } | undefined,
  call: (token: string | null) => T,
) => Promise<T>
