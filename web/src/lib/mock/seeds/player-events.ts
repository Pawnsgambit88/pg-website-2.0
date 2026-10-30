import type { EventStatus } from '@/lib/api/types/event-state'
import type { MediaRef } from '@/lib/api/types/media'
import type { Slug } from '@/lib/api/types/primitives'
import { mockIstAt } from '@/lib/mock/seeds/clock'
import { MOCK_EVENTS } from '@/lib/mock/seeds/events'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { mockSlug } from '@/lib/mock/seeds/slug'

// Event references for the player area (immutable). The signed-in routes use the event UUID (`/app/events/{id}`, OQ-06)
// while the public seeds carry only slugs, so the ids live here. The four public events are projected from MOCK_EVENTS;
// three more exist only for the demo player's history and payment states (their public pages do not exist in the mock).

export interface MockEventRef {
  id: string
  slug: Slug
  title: string
  startsAt: string
  area: string
  /** `Venue name · Area` as the dashboard and the Event Room show it. */
  venue: string
  status: EventStatus
  pricePaise: number
  rated: boolean
  timeControl: string
  window: { opensAt: string | null; closesAt: string | null; waitlistEnabled: boolean }
  /** Event cover image (EV-01). Null when the event has none. */
  cover: MediaRef | null
}

const PUBLIC_IDS: Readonly<Record<string, string>> = {
  'saturday-social': 'e5e1d000-0000-4000-8000-000000000001',
  'beginner-circle': 'e5e1d000-0000-4000-8000-000000000002',
  'after-work-blitz': 'e5e1d000-0000-4000-8000-000000000003',
  'monsoon-open': 'e5e1d000-0000-4000-8000-000000000004',
}

const publicRefs: MockEventRef[] = MOCK_EVENTS.map((event) => ({
  id: PUBLIC_IDS[event.slug] ?? 'e5e1d000-0000-4000-8000-0000000000ff',
  slug: event.slug,
  title: event.title,
  startsAt: event.startsAt,
  area: event.area,
  venue: `${event.venue.venueName} · ${event.venue.area}`,
  status: event.status,
  pricePaise: event.price.pricePaise,
  rated: event.rated,
  timeControl: event.atAGlance.timeControl,
  window: { ...event.registration },
  cover: event.cover ?? null,
}))

const extraRefs: MockEventRef[] = [
  {
    id: 'e5e1d000-0000-4000-8000-000000000011',
    slug: mockSlug('coffeehouse-rapid'),
    title: 'Coffeehouse Rapid',
    startsAt: mockIstAt(9, '18:00'),
    area: 'Madhapur',
    venue: 'The Filter Room · Madhapur',
    status: 'registration_open',
    pricePaise: 30000,
    rated: true,
    timeControl: '15+10',
    window: { opensAt: mockIstAt(-5, '10:00'), closesAt: mockIstAt(9, '12:00'), waitlistEnabled: true },
    cover: null,
  },
  {
    id: 'e5e1d000-0000-4000-8000-000000000012',
    slug: mockSlug('lakeside-blitz'),
    title: 'Lakeside Blitz',
    startsAt: mockIstAt(12, '19:00'),
    area: 'Gachibowli',
    venue: 'Lakeside Pavilion · Gachibowli',
    status: 'registration_open',
    pricePaise: 30000,
    rated: true,
    timeControl: '5+2',
    window: { opensAt: mockIstAt(-3, '10:00'), closesAt: mockIstAt(12, '17:00'), waitlistEnabled: false },
    cover: null,
  },
  {
    id: 'e5e1d000-0000-4000-8000-000000000013',
    slug: mockSlug('coffeehouse-rapid-sep'),
    title: 'Coffeehouse Rapid',
    startsAt: '2026-09-05T17:00:00+05:30',
    area: 'Madhapur',
    venue: 'The Filter Room · Madhapur',
    status: 'completed',
    pricePaise: 30000,
    rated: true,
    timeControl: '15+10',
    window: { opensAt: '2026-08-20T10:00:00+05:30', closesAt: '2026-09-05T12:00:00+05:30', waitlistEnabled: false },
    cover: null,
  },
]

export const MOCK_EVENT_REFS: readonly MockEventRef[] = deepFreeze([...publicRefs, ...extraRefs])

export function eventRefBySlug(slug: string): MockEventRef | undefined {
  return MOCK_EVENT_REFS.find((event) => event.slug === slug)
}

export function eventRefById(id: string): MockEventRef | undefined {
  return MOCK_EVENT_REFS.find((event) => event.id === id)
}

/** The event whose Event Room the demo opens by default (screens 24 to 29). */
export const ROOM_EVENT_SLUG = 'beginner-circle'
