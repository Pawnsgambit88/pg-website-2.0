import type { EventDetailDto } from '@/lib/api/types/event'
import type { ProfileField } from '@/lib/api/types/profile'
import type { RegistrationDto, RegistrationStateDto } from '@/lib/api/types/registration'

// Registration screen resolver (FE-05; screens 18 to 21). A pure function: it turns what the backend said (the R01 state,
// the public event, the session) into ONE screen to show. It never infers eligibility, price, capacity or a hold from
// the clock: R01 owns those. The only facts it reads from the event are the ones R01 cannot express (a cancelled event
// is reported by R01 as `closed`, so the event status is what lets the page say "cancelled" instead of "closed").
//
// FE-06 / FE-07 / FE-08 fill the screens that carry a `slot`; every other screen is complete here.

export type FrameSlot = 'FE-06' | 'FE-07' | 'FE-08'

export type RegistrationScreen =
  // ---- ineligible and shell states (complete in FE-05) ----
  | { kind: 'sign_in' }
  | { kind: 'event_cancelled'; reason: string | null }
  | { kind: 'closed'; ended: boolean }
  | { kind: 'not_yet_open'; opensAt: string }
  | { kind: 'profile_incomplete'; fields: readonly ProfileField[] }
  | { kind: 'not_eligible'; reason: 'event_restricted' | 'age_restricted' }
  | { kind: 'sold_out' }
  | { kind: 'inactive_registration'; registration: Extract<RegistrationDto, { status: 'cancelled' | 'refunded' }> }
  // ---- screens with a slot (filled by later tasks) ----
  | { kind: 'open_free'; slot: 'FE-06' }
  | { kind: 'open_paid'; slot: 'FE-08'; pricePaise: number; holdMinutes: number }
  | { kind: 'registered'; slot: 'FE-06'; registration: Extract<RegistrationDto, { status: 'confirmed' }> }
  | { kind: 'hold_active'; slot: 'FE-08'; registration: Extract<RegistrationDto, { status: 'pending' }> }
  | { kind: 'payment_confirming'; slot: 'FE-08'; registration: Extract<RegistrationDto, { status: 'confirming' }> }
  | { kind: 'waitlist_available'; slot: 'FE-07'; position: number }
  | { kind: 'on_waitlist'; slot: 'FE-07'; registration: Extract<RegistrationDto, { status: 'waitlist' }> }
  | {
      kind: 'offer_pending'
      slot: 'FE-07'
      registration: Extract<RegistrationDto, { status: 'waitlist' }>
      offerExpiresAt: string
      serverNow: string
      /** From R01: lets the offer panel say whether accepting confirms (0) or starts the payment hold. */
      pricePaise: number
    }

/** Session status as the frame sees it (structurally the auth store's status; features may not import each other). */
export type SessionStatus = 'loading' | 'signed-out' | 'signed-in'

export type ScreenKind = RegistrationScreen['kind']
/** Screens whose body a later task fills. */
export type SlotScreen = Extract<RegistrationScreen, { slot: FrameSlot }>
/** Screens complete in the frame. */
export type PanelScreen = Exclude<RegistrationScreen, SlotScreen>

export interface ResolveInput {
  /** Settled session only: the frame shows a skeleton while the session is still loading. */
  session: 'signed-in' | 'signed-out'
  event: Pick<EventDetailDto, 'status' | 'cancelled'>
  /** R01. Null when signed out (it is never requested). */
  state: RegistrationStateDto | null
}

const OVER_STATUSES: ReadonlySet<EventDetailDto['status']> = new Set(['completed', 'ongoing'])

function resolveRegistered(registration: RegistrationDto, pricePaise: number): RegistrationScreen {
  switch (registration.status) {
    case 'confirmed':
      return { kind: 'registered', slot: 'FE-06', registration }
    case 'pending':
      return { kind: 'hold_active', slot: 'FE-08', registration }
    case 'confirming':
      return { kind: 'payment_confirming', slot: 'FE-08', registration }
    case 'waitlist':
      return registration.offer === null
        ? { kind: 'on_waitlist', slot: 'FE-07', registration }
        : {
            kind: 'offer_pending',
            slot: 'FE-07',
            registration,
            offerExpiresAt: registration.offer.expiresAt,
            serverNow: registration.offer.serverNow,
            pricePaise,
          }
    case 'cancelled':
    case 'refunded':
      // R01 never reports these as `already_registered`; shown defensively instead of a wrong "you are in".
      return { kind: 'inactive_registration', registration }
  }
}

export function resolveScreen({ session, event, state }: ResolveInput): RegistrationScreen {
  if (event.status === 'cancelled' || event.cancelled !== null) {
    return { kind: 'event_cancelled', reason: event.cancelled?.reason ?? null }
  }
  if (session === 'signed-out' || state === null) {
    return OVER_STATUSES.has(event.status) ? { kind: 'closed', ended: true } : { kind: 'sign_in' }
  }
  switch (state.state) {
    case 'already_registered':
      return resolveRegistered(state.registration, state.pricePaise)
    case 'closed':
      return { kind: 'closed', ended: OVER_STATUSES.has(event.status) }
    case 'not_yet_open':
      return { kind: 'not_yet_open', opensAt: state.opensAt }
    case 'ineligible':
      return state.reason === 'profile_incomplete'
        ? { kind: 'profile_incomplete', fields: state.requiredProfileFields }
        : { kind: 'not_eligible', reason: state.reason }
    case 'full_waitlist':
      return { kind: 'waitlist_available', slot: 'FE-07', position: state.waitlistPosition }
    case 'sold_out':
      return { kind: 'sold_out' }
    case 'open_free':
      return { kind: 'open_free', slot: 'FE-06' }
    case 'open_paid':
      return { kind: 'open_paid', slot: 'FE-08', pricePaise: state.pricePaise, holdMinutes: state.holdMinutes }
  }
}

export function isSlotScreen(screen: RegistrationScreen): screen is SlotScreen {
  return 'slot' in screen
}

/** The task that owns the screen body, or null when the screen is complete in the frame. */
export function slotOf(screen: RegistrationScreen): FrameSlot | null {
  return isSlotScreen(screen) ? screen.slot : null
}

// ---------- Step indicator ----------

export interface FlowStep {
  id: string
  label: string
}

export interface FlowSteps {
  steps: readonly FlowStep[]
  current: string
}

const FREE_STEPS: readonly FlowStep[] = [
  { id: 'review', label: 'Review' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'done', label: 'Done' },
]
const PAID_STEPS: readonly FlowStep[] = [
  { id: 'review', label: 'Review' },
  { id: 'pay', label: 'Pay' },
  { id: 'done', label: 'Done' },
]
const WAITLIST_STEPS: readonly FlowStep[] = [
  { id: 'review', label: 'Review' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'done', label: 'Done' },
]

/** Steps for the screens that sit on a path (slot screens). Null for ineligible screens: there is no path to show. */
export function flowStepsOf(screen: RegistrationScreen): FlowSteps | null {
  switch (screen.kind) {
    case 'open_free':
      return { steps: FREE_STEPS, current: 'review' }
    case 'registered':
      // A confirmed place is the end of whichever path was taken; the free path is the neutral rendering.
      return { steps: FREE_STEPS, current: 'done' }
    case 'open_paid':
      return { steps: PAID_STEPS, current: 'review' }
    case 'hold_active':
    case 'payment_confirming':
      return { steps: PAID_STEPS, current: 'pay' }
    case 'waitlist_available':
      return { steps: WAITLIST_STEPS, current: 'review' }
    case 'on_waitlist':
    case 'offer_pending':
      return { steps: WAITLIST_STEPS, current: 'waitlist' }
    default:
      return null
  }
}
