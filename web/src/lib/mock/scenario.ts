import { z } from 'zod'
import { ROOM_STATES } from '@/lib/api/types/event-room'
import { REGISTRATION_STATUSES } from '@/lib/api/types/registration'

// Player scenario switcher (TASK-019). PURE: parses `?mock=` tokens into a value; nothing here reads the URL or storage.
// The browser store (store.browser.ts) remembers the value for the session; the server never has one (default `{}`).
//
//   ?mock=room:live                  Event Room state of the demo event (aliases below)
//   ?mock=room:manual | room:awaiting | room:rating-pending     the three extra room variants
//   ?mock=reg:waitlist               status of the demo player's Beginner Circle registration (My Events, room access)
//   ?mock=reg:open_paid              registration RESOLVER state returned for every event (R01)
//   ?mock=next:none                  dashboard without a next event
//   ?mock=rating:empty               every rating pool unrated, empty ledger
//   ?mock=reset                      clears the scenario
//   Tokens combine with commas and with the existing modes: ?mock=slow,room:live

const ROOM_ALIASES: Readonly<Record<string, string>> = {
  before: 'before_checkin',
  'before-checkin': 'before_checkin',
  checkin: 'checkin_open',
  'check-in': 'checkin_open',
  pairing: 'pairing_pending',
  live: 'live_round',
  between: 'between_rounds',
  manual: 'manual_checkin',
  awaiting: 'awaiting_confirmation',
  'rating-pending': 'rating_pending',
}

export const ROOM_VARIANTS = [...ROOM_STATES, 'manual_checkin', 'awaiting_confirmation', 'rating_pending'] as const
export const roomVariantSchema = z.enum(ROOM_VARIANTS)
export type RoomVariant = z.infer<typeof roomVariantSchema>

export const RESOLVER_VARIANTS = [
  'open_free',
  'open_paid',
  'full_waitlist',
  'sold_out',
  'closed',
  'not_yet_open',
  'already_registered',
  'ineligible',
] as const
/** `reg:` accepts a registration status (changes the demo registration) or a resolver state (changes R01). */
export const regVariantSchema = z.enum([...REGISTRATION_STATUSES, 'offer', ...RESOLVER_VARIANTS])
export type RegVariant = z.infer<typeof regVariantSchema>
export type ResolverVariant = (typeof RESOLVER_VARIANTS)[number]

export const scenarioSchema = z.object({
  room: roomVariantSchema.optional(),
  reg: regVariantSchema.optional(),
  next: z.literal('none').optional(),
  rating: z.literal('empty').optional(),
})
export type MockScenario = z.infer<typeof scenarioSchema>

export const NO_SCENARIO: MockScenario = Object.freeze({})

export function isResolverVariant(value: RegVariant | undefined): value is ResolverVariant {
  return value !== undefined && (RESOLVER_VARIANTS as readonly string[]).includes(value)
}

/**
 * Reads the scenario tokens of a `mock` query value. Returns `null` when the value has none (so a plain `?mock=slow`
 * leaves a remembered scenario alone) and `{}` for `reset`.
 */
export function parseScenarioTokens(value: string | null): MockScenario | null {
  if (value === null) return null
  const draft: Record<string, string> = {}
  let found = false
  for (const token of value.split(',')) {
    const [key, raw] = token.trim().split(':')
    if (token.trim() === 'reset') return {}
    if (key === undefined || raw === undefined) continue
    const name = (ROOM_ALIASES[raw] ?? raw).replaceAll('-', '_')
    if (key === 'room' || key === 'reg' || key === 'next' || key === 'rating') {
      draft[key] = key === 'room' ? name : raw.replaceAll('-', '_')
      found = true
    }
  }
  if (!found) return null
  // Drop invalid pieces one by one so a typo in one token does not discard the others.
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(draft)) {
    const single = scenarioSchema.safeParse({ [key]: raw })
    if (single.success) Object.assign(result, single.data)
  }
  return scenarioSchema.parse(result)
}

/** Splits a `mock` value into the legacy mode token(s) so `?mock=slow,room:live` still selects slow. */
export function modeTokens(value: string | null): string[] {
  return value === null ? [] : value.split(',').map((token) => token.trim())
}
