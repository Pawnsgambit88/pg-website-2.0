import type { RegistrationDto } from '@/lib/api/types/registration'
import type { PaymentSummary } from '@/lib/api/types/payment'
import { MOCK_NOW, mockIstAt } from '@/lib/mock/seeds/clock'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { eventRefBySlug, type MockEventRef } from '@/lib/mock/seeds/player-events'

// The demo player's registrations at MOCK_NOW, one per state of UI-STATES "Event registration". Immutable. The browser
// session store holds only the changes a player makes on top of these (lib/mock/player/state.ts).

/** Demo player id (auth/demo-accounts.ts): only this account has player data; every other account is empty. */
export const DEMO_PLAYER_ID = 'a5e1d000-0000-4000-8000-000000000001'

export const REGISTRATION_IDS = {
  beginnerCircle: 'f5e1d000-0000-4000-8000-000000000001',
  afterWorkBlitz: 'f5e1d000-0000-4000-8000-000000000002',
  coffeehouseRapid: 'f5e1d000-0000-4000-8000-000000000003',
  lakesideBlitz: 'f5e1d000-0000-4000-8000-000000000004',
  monsoonOpen: 'f5e1d000-0000-4000-8000-000000000005',
  coffeehouseSep: 'f5e1d000-0000-4000-8000-000000000006',
} as const

/** Minutes a paid reservation holds a place (also `holdMinutes` of the resolver). */
export const HOLD_MINUTES = 15

export function paidSummary(pricePaise: number): PaymentSummary {
  return { orderState: 'paid', refundState: 'none', amountPaise: pricePaise, currency: 'INR' }
}

function ref(slug: string): MockEventRef {
  const found = eventRefBySlug(slug)
  if (found === undefined) throw new Error(`Unknown mock event ${slug}`)
  return found
}

const base = (id: string, slug: string, createdAt: string) => ({
  id,
  eventId: ref(slug).id,
  eventSlug: ref(slug).slug,
  createdAt,
})

export const MOCK_REGISTRATIONS: readonly RegistrationDto[] = deepFreeze([
  // Confirmed upcoming, paid. The next-up item and the Event Room belong to it.
  {
    ...base(REGISTRATION_IDS.beginnerCircle, 'beginner-circle', mockIstAt(-4, '12:10')),
    status: 'confirmed',
    payment: paidSummary(ref('beginner-circle').pricePaise),
  },
  // Waitlist: sold out, no offer yet.
  {
    ...base(REGISTRATION_IDS.afterWorkBlitz, 'after-work-blitz', mockIstAt(-2, '19:45')),
    status: 'waitlist',
    position: 3,
    offer: null,
  },
  // Pending payment: a place is held for a few more minutes.
  {
    ...base(REGISTRATION_IDS.coffeehouseRapid, 'coffeehouse-rapid', mockIstAt(0, '08:50')),
    status: 'pending',
    holdExpiresAt: new Date(Date.parse(MOCK_NOW) + 14 * 60_000).toISOString().replace('Z', '+00:00'),
    serverNow: MOCK_NOW,
    payment: { orderState: 'created', refundState: 'none', amountPaise: 30000, currency: 'INR' },
  },
  // Cancelled by the player, refund on its way.
  {
    ...base(REGISTRATION_IDS.lakesideBlitz, 'lakeside-blitz', mockIstAt(-6, '09:30')),
    status: 'cancelled',
    cancelledAt: mockIstAt(-1, '18:20'),
    payment: { orderState: 'paid', refundState: 'pending', amountPaise: 30000, currency: 'INR' },
  },
  // Completed history.
  {
    ...base(REGISTRATION_IDS.monsoonOpen, 'monsoon-open', '2026-08-25T11:00:00+05:30'),
    status: 'confirmed',
    payment: paidSummary(ref('monsoon-open').pricePaise),
  },
  {
    ...base(REGISTRATION_IDS.coffeehouseSep, 'coffeehouse-rapid-sep', '2026-08-28T20:15:00+05:30'),
    status: 'confirmed',
    payment: paidSummary(30000),
  },
] satisfies RegistrationDto[])
