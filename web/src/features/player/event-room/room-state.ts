import type {
  CapabilitiesDto,
  Colour,
  EventRoomSnapshotDto,
  ResultDto,
  ResultOutcome,
  RoomState,
} from '@/lib/api/types/event-room'
import type { GameOutcome } from '@/lib/api/types/rating'

// Pure derivation helpers for the Event Room (ARCH-001 11, UI-STATES "Event attendance"). No React, no I/O. The UI
// renders from `roomState`, `checkIn`, `result` and `capabilities`; nothing here decides who may act.

export type RoomSnapshot = EventRoomSnapshotDto
type Of<S extends RoomState> = Extract<RoomSnapshot, { roomState: S }>
export type LiveRoom = Of<'live_round'>
export type BetweenRoom = Of<'between_rounds'>
export type CompleteRoom = Of<'complete'>

/** Which screen (24 to 29) a snapshot shows. One-to-one with `roomState`; kept as a function so tests can pin it. */
export type RoomScreen =
  | 'before-checkin' // 24
  | 'checkin' // 25
  | 'pairing-pending' // 26
  | 'live' // 27
  | 'between-rounds' // 28
  | 'complete' // 29

const SCREEN: Readonly<Record<RoomState, RoomScreen>> = {
  before_checkin: 'before-checkin',
  checkin_open: 'checkin',
  pairing_pending: 'pairing-pending',
  live_round: 'live',
  between_rounds: 'between-rounds',
  complete: 'complete',
}

export const screenFor = (snapshot: RoomSnapshot): RoomScreen => SCREEN[snapshot.roomState]

export const ROOM_STATE_LABEL: Readonly<Record<RoomState, string>> = {
  before_checkin: 'Check-in not open',
  checkin_open: 'Check-in open',
  pairing_pending: 'Pairing soon',
  live_round: 'Round live',
  between_rounds: 'Between rounds',
  complete: 'Event complete',
}

// ---------- polling ----------

export const POLL_MS = {
  /** Idle ceiling (AC-45). */
  idle: 30_000,
  checkIn: 10_000,
  pairing: 5_000,
  live: 15_000,
  /** A result is waiting on someone: look sooner. */
  resultPending: 8_000,
  between: 5_000,
  ratingPending: 15_000,
} as const

export function isRatingPending(snapshot: RoomSnapshot): boolean {
  return snapshot.roomState === 'complete' && snapshot.ratingProcessing.status === 'pending'
}

/** Faster while something is about to change, 30 s when nothing is. `undefined` (no data yet) is idle. */
export function pollIntervalMs(snapshot: RoomSnapshot | undefined): number {
  if (snapshot === undefined) return POLL_MS.idle
  switch (snapshot.roomState) {
    case 'before_checkin':
      return POLL_MS.idle
    case 'checkin_open':
      return POLL_MS.checkIn
    case 'pairing_pending':
      return POLL_MS.pairing
    case 'live_round':
      return snapshot.result.state === 'submitted' || snapshot.result.state === 'awaiting_confirmation'
        ? POLL_MS.resultPending
        : POLL_MS.live
    case 'between_rounds':
      return POLL_MS.between
    case 'complete':
      return isRatingPending(snapshot) ? POLL_MS.ratingPending : POLL_MS.idle
  }
}

// ---------- capabilities ----------

export type ActionCapability = 'canCheckIn' | 'canSubmitResult' | 'canConfirmResult' | 'canDispute'

/** Visible text for a disabled action (AC-84): the server's reason, or null when the action is available. */
export function disabledReason(snapshot: RoomSnapshot, capability: ActionCapability): string | null {
  if (snapshot.capabilities[capability]) return null
  return snapshot.disabledReasons[capability] ?? null
}

export const hasAnyAction = (caps: CapabilitiesDto): boolean =>
  caps.canCheckIn || caps.canSubmitResult || caps.canConfirmResult || caps.canDispute

// ---------- results ----------

/** Choice shown to the player (their own point of view). */
export type MyOutcome = GameOutcome

export const MY_OUTCOMES: readonly MyOutcome[] = ['win', 'draw', 'loss']

const OTHER: Readonly<Record<Colour, Colour>> = { white: 'black', black: 'white' }

/** Win / draw / loss for me -> the wire outcome (which colour won). */
export function toWireOutcome(choice: MyOutcome, myColour: Colour): ResultOutcome {
  if (choice === 'draw') return 'draw'
  return choice === 'win' ? myColour : OTHER[myColour]
}

/** The wire outcome -> win / draw / loss from my side. */
export function toMyOutcome(outcome: ResultOutcome, myColour: Colour): MyOutcome {
  if (outcome === 'draw') return 'draw'
  return outcome === myColour ? 'win' : 'loss'
}

export const MY_OUTCOME_LABEL: Readonly<Record<MyOutcome, string>> = {
  win: 'I won',
  draw: 'Draw',
  loss: 'I lost',
}

export const MY_OUTCOME_SENTENCE: Readonly<Record<MyOutcome, string>> = {
  win: 'You won',
  draw: 'Draw',
  loss: 'You lost',
}

export type SubmitterWord = 'you' | 'your opponent' | 'the host'
export function submitterWord(by: 'me' | 'opponent' | 'host' | undefined): SubmitterWord | null {
  if (by === undefined) return null
  return by === 'me' ? 'you' : by === 'opponent' ? 'your opponent' : 'the host'
}

// ---------- what-happens-next panel ----------

export type StepStatus = 'done' | 'current' | 'pending'

/**
 * Four-step journey panel: Registration → Arrival → Pairing → Result.
 * Ticks derive from `roomState` and `checkIn` only (EV-06 AC).
 */
export function whatHappensNextSteps(
  snapshot: RoomSnapshot,
): readonly [StepStatus, StepStatus, StepStatus, StepStatus] {
  const arrived: StepStatus = snapshot.checkIn.status === 'checked_in' ? 'done' : 'pending'
  switch (snapshot.roomState) {
    case 'before_checkin':
    case 'checkin_open':
    case 'pairing_pending':
      return ['done', arrived, 'pending', 'pending']
    case 'live_round':
    case 'between_rounds':
      return ['done', arrived, 'current', 'pending']
    case 'complete':
      return ['done', 'done', 'done', 'done']
  }
}

/**
 * Event-complete headline (screen 29). Derives the games count from `roundsPlayed`; new-opponents count is not in the
 * snapshot (EV-06 Q10: else generic).
 */
export function deriveCompleteHeadline(roundsPlayed: number): string {
  if (!Number.isSafeInteger(roundsPlayed) || roundsPlayed <= 0) {
    return 'All done. Thank you for playing.'
  }
  const games = roundsPlayed === 1 ? '1 game' : `${roundsPlayed} games`
  return `${games} played. Well played.`
}

// ---------- announcements ----------

/**
 * One short polite sentence when the room meaningfully changes, else null. Compares only fields that matter to the
 * player (never `serverNow` or `version`), so a poll with no real change says nothing (ARCH-001 15, AC-90). The
 * player's own actions announce themselves from the mutation, so a result going none -> submitted-by-me is not here.
 */
export function announcementFor(prev: RoomSnapshot | undefined, next: RoomSnapshot): string | null {
  if (prev === undefined) return null
  if (prev.roomState !== next.roomState) {
    switch (next.roomState) {
      case 'before_checkin':
        return null
      case 'checkin_open':
        return 'Check-in is now open.'
      case 'pairing_pending':
        return 'Pairing is being prepared.'
      case 'live_round':
        return next.pairing === null
          ? next.bye === null
            ? 'A round has started.'
            : `Round ${next.bye.round} has started. You have a bye.`
          : `Pairing published. Round ${next.pairing.round}, board ${next.pairing.board}, against ${next.pairing.opponent.displayName}.`
      case 'between_rounds':
        return 'Round finished. The next pairing is being prepared.'
      case 'complete':
        return 'The event is complete.'
    }
  }
  if (next.roomState === 'live_round' && prev.roomState === 'live_round') {
    if (prev.pairing?.pairingId !== next.pairing?.pairingId && next.pairing !== null) {
      return `New pairing published. Round ${next.pairing.round}, board ${next.pairing.board}.`
    }
  }
  if (prev.result.state !== next.result.state) {
    return announceResult(prev.result, next.result)
  }
  if (prev.roomState === 'complete' && next.roomState === 'complete') {
    if (prev.ratingProcessing.status === 'pending' && next.ratingProcessing.status === 'complete') {
      return 'Your rating update is ready.'
    }
  }
  return null
}

function announceResult(prev: ResultDto, next: ResultDto): string | null {
  switch (next.state) {
    case 'awaiting_confirmation':
      return next.submittedBy === 'me' ? null : 'Your opponent submitted a result. Please confirm it or raise an issue.'
    case 'disputed':
      return prev.state === 'none' ? null : 'The result is under review by the host.'
    case 'final':
      return 'Your result is final.'
    case 'submitted':
    case 'none':
      return null
  }
}
