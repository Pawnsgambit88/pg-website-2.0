import type { ApiError } from '@/lib/api/errors'
import type { Slug } from '@/lib/api/types/primitives'
import type { JoinWaitlistInput } from '@/lib/api/types/registration'
import { copyFor } from '@/lib/api/error-copy'

// Waitlist and offer logic (EV-03 / FE-07; screen 20). Pure: the components only wire it to React.
// The server owns the queue, the position and the offer clock, so requests carry intent only and the countdown is
// computed from the server's own `serverNow`/`expiresAt` pair, never from the browser's wall clock.

/** R03 body: the event slug only. Joining takes no payment and sends no price. */
export function joinWaitlistInput(slug: Slug): JoinWaitlistInput {
  return { eventSlug: slug }
}

/**
 * What the screen does after a failed join, leave or accept.
 *  settled   the server already agrees with what the player wanted (already registered or listed): re-read R01
 *  moved     the situation changed (full, closed, places opened, offer lapsed): re-read R01, the resolver picks the screen
 *  expired   accepting an offer that ran out (the server answers HOLD_EXPIRED; there is no separate offer code)
 *  retry     nothing is known to have changed: keep the page and offer another tap (same Idempotency-Key)
 */
export type WaitlistFailureKind = 'settled' | 'moved' | 'expired' | 'retry'

export interface WaitlistFailure {
  kind: WaitlistFailureKind
  title: string
  body: string
}

export type WaitlistAction = 'join' | 'leave' | 'accept'

const ACTION_TEXT: Record<WaitlistAction, string> = {
  join: 'join the waitlist',
  leave: 'leave the waitlist',
  accept: 'accept this place',
}

const MOVED_CODES: ReadonlySet<string> = new Set([
  'EVENT_FULL',
  'REGISTRATION_CLOSED',
  'REGISTRATION_NOT_OPEN',
  'EVENT_NOT_FOUND',
  'NOT_FOUND',
])

/** R03 answers "places are still available" with VALIDATION_FAILED and an `eventSlug` field message. */
export function isPlacesAvailable(error: ApiError): boolean {
  return error.code === 'VALIDATION_FAILED' && error.fields?.['eventSlug'] !== undefined
}

export function describeWaitlistFailure(error: ApiError, action: WaitlistAction): WaitlistFailure {
  if (action === 'accept' && error.code === 'HOLD_EXPIRED') {
    return {
      kind: 'expired',
      title: 'This offer has expired',
      body: 'The place has passed to the next player. Nothing was charged.',
    }
  }
  if (error.code === 'ALREADY_REGISTERED') {
    return {
      kind: 'settled',
      title: action === 'join' ? "You're already on the list" : "You're already registered",
      body: 'We are showing your current status.',
    }
  }
  if (action === 'join' && isPlacesAvailable(error)) {
    return {
      kind: 'moved',
      title: 'A place has opened up',
      body: 'There is room again, so you can register without waiting.',
    }
  }
  const copy = copyFor(error, { action: ACTION_TEXT[action] })
  if (MOVED_CODES.has(error.code)) return { kind: 'moved', title: copy.title, body: copy.body }
  return { kind: 'retry', title: copy.title, body: copy.body }
}

// ---------- Offer countdown (no client-clock trust) ----------

/**
 * Milliseconds left on an offer. `serverNow` is the server's clock when the response was made and `elapsedMs` is how long
 * the browser has held that response (a monotonic measure), so a wrong device clock or time zone changes nothing.
 * Never negative; an unreadable value counts as expired, the safe side (the server decides on accept anyway).
 */
export function remainingMs(expiresAt: string, serverNow: string, elapsedMs: number): number {
  const end = Date.parse(expiresAt)
  const start = Date.parse(serverNow)
  if (!Number.isFinite(end) || !Number.isFinite(start)) return 0
  return Math.max(0, end - start - Math.max(0, elapsedMs))
}

/** "29:05", or "1:02:03" past an hour. Rounds up so "0:00" only appears once the offer has really run out. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${String(hours)}:${pad(minutes)}:${pad(seconds)}` : `${String(minutes)}:${pad(seconds)}`
}

/** Screen-reader text for the same value ("29 minutes 5 seconds"); the visible digits are not read out each second. */
export function countdownLabel(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const unit = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`
  if (minutes === 0) return unit(seconds, 'second')
  return seconds === 0 ? unit(minutes, 'minute') : `${unit(minutes, 'minute')} ${unit(seconds, 'second')}`
}

/** Whether accepting confirms at once (free) or moves on to the payment hold (paid, EV-04). */
export function offerIsFree(pricePaise: number): boolean {
  return pricePaise === 0
}
