import { z } from 'zod'
import { isoInstantSchema } from '@/lib/api/types/primitives'

// Event vocabulary and state machine (STATE-MACHINES.md "Event", EVENT-ENGINE.md, contract P02 to P04).
//
//   draft -> published -> registration_open -> sold_out | ongoing -> completed
//   draft | published | registration_open | sold_out -> cancelled (admin confirmation, participant communication)

/** Every status an event can hold (admin and backend). `draft` never appears on a public DTO. */
export const EVENT_STATUSES = [
  'draft',
  'published',
  'registration_open',
  'sold_out',
  'ongoing',
  'completed',
  'cancelled',
] as const
export const eventStatusSchema = z.enum(EVENT_STATUSES)
export type EventStatus = z.infer<typeof eventStatusSchema>

/** Statuses a public read can return: published projections only (FR-04). */
export const PUBLIC_EVENT_STATUSES = [
  'published',
  'registration_open',
  'sold_out',
  'ongoing',
  'completed',
  'cancelled',
] as const
export const publicEventStatusSchema = z.enum(PUBLIC_EVENT_STATUSES)
export type PublicEventStatus = z.infer<typeof publicEventStatusSchema>

/** Allowed transitions, for mock stores and admin UI tests. The server owns the machine; the UI never enforces it. */
export const EVENT_TRANSITIONS: Readonly<Record<EventStatus, readonly EventStatus[]>> = {
  draft: ['published'],
  published: ['registration_open', 'cancelled'],
  registration_open: ['sold_out', 'ongoing', 'cancelled'],
  sold_out: ['registration_open', 'ongoing', 'cancelled'],
  ongoing: ['completed'],
  completed: [],
  cancelled: [],
}

/** Event type: a configurable default, not a product fork (EVENT-ENGINE.md; builder step 1). */
export const EVENT_TYPES = ['social', 'rated_tournament', 'league', 'workshop', 'special'] as const
export const eventTypeSchema = z.enum(EVENT_TYPES)
export type EventType = z.infer<typeof eventTypeSchema>

/** Audience signals on a card (FR-13 filters: Beginner friendly, come solo). `all_levels` is the neutral tag. */
export const EVENT_AUDIENCES = ['all_levels', 'beginner', 'solo'] as const
export const eventAudienceSchema = z.enum(EVENT_AUDIENCES)
export type EventAudience = z.infer<typeof eventAudienceSchema>

/** Pairing mode (EVENT-ENGINE.md). League and workshop engines are Later (F-PAIR-010). */
export const PAIRING_MODES = ['social_balanced', 'swiss', 'round_robin', 'none'] as const
export const pairingModeSchema = z.enum(PAIRING_MODES)
export type PairingMode = z.infer<typeof pairingModeSchema>

// ---------- Availability (contract P04; ARCH-001 11.6 availability island) ----------

export const AVAILABILITY_STATES = [
  'open',
  'full_waitlist',
  'sold_out',
  'closed',
  'not_yet_open',
  'completed',
  'cancelled',
] as const
export const availabilityStateSchema = z.enum(AVAILABILITY_STATES)
export type AvailabilityState = z.infer<typeof availabilityStateSchema>

const places = z.int().min(0).max(100000)
/** Additive: true when the event has no capacity limit (placesLeft is then a sentinel and must not be shown). */
const unlimited = z.boolean().optional()

/**
 * `GET /events/{slug}/availability`, no-store, tiny, no auth. A discriminated union so that contradictions cannot be
 * represented: `open` always has a place left and no waitlist; `full_waitlist` has none left and a waitlist;
 * `sold_out` has none left and no waitlist. The remaining states carry the count for display only.
 */
export const availabilitySchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('open'),
    unlimited,
    placesLeft: places.min(1),
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('full_waitlist'),
    placesLeft: z.literal(0),
    waitlistOpen: z.literal(true),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('sold_out'),
    placesLeft: z.literal(0),
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('closed'),
    unlimited,
    placesLeft: places,
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('not_yet_open'),
    unlimited,
    placesLeft: places,
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('completed'),
    unlimited,
    placesLeft: places,
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
  z.object({
    state: z.literal('cancelled'),
    unlimited,
    placesLeft: places,
    waitlistOpen: z.literal(false),
    serverNow: isoInstantSchema,
  }),
])
export type AvailabilityDto = z.infer<typeof availabilitySchema>
