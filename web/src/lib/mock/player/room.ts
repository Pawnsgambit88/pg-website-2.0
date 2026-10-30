import { ApiError } from '@/lib/api/errors'
import type { PgEventRoomApi } from '@/lib/api/pg-api'
import type {
  CapabilitiesDto,
  CheckInDto,
  EventRoomSnapshotDto,
  ResultDto,
  ResultUpdateDto,
} from '@/lib/api/types/event-room'
import { MOCK_NOW } from '@/lib/mock/seeds/clock'
import { notFound, toIso, type PlayerContext, type PlayerRunner } from '@/lib/mock/player/context'
import { registrationsOf, type Bearer } from '@/lib/mock/player/regs'
import type { RoomVariant } from '@/lib/mock/scenario'
import { eventRefById, ROOM_EVENT_SLUG, type MockEventRef } from '@/lib/mock/seeds/player-events'
import {
  MOCK_PAIRING,
  MOCK_PAIRING_ID,
  MOCK_ROOM_RATING,
  MOCK_SCORE_BETWEEN,
  MOCK_SCORE_FINAL,
  MOCK_STANDINGS,
} from '@/lib/mock/seeds/player-room'

// Event Room snapshots (screens 24 to 29 plus manual check-in, result awaiting confirmation and rating pending).
// A snapshot is a pure function of (event, effective variant, session progress): nothing is stored per variant. Check-in
// and result submission change `state.room`, and the next snapshot reflects them. Only the player's own pairing is
// returned. The variant of the demo event is forced by `?mock=room:<variant>`; every other event is natural: upcoming
// events before check-in, completed events complete.

const MIN = 60_000
const at = (event: MockEventRef, minutes: number) => toIso(Date.parse(event.startsAt) + minutes * MIN)

const NO_CAPS: CapabilitiesDto = {
  canCheckIn: false,
  canSubmitResult: false,
  canConfirmResult: false,
  canDispute: false,
  canContactHost: true,
}

/** Minutes from the start at which the server clock stands in each variant (so countdowns make sense). */
const CLOCK: Readonly<Record<RoomVariant, number>> = {
  before_checkin: 0,
  checkin_open: -20,
  manual_checkin: -20,
  pairing_pending: -5,
  live_round: 60,
  awaiting_confirmation: 70,
  between_rounds: 95,
  complete: 240,
  rating_pending: 240,
}

const NEXT_ACTION: Readonly<Record<RoomVariant, string>> = {
  before_checkin: 'Check-in opens 30 minutes before play.',
  checkin_open: 'Check-in is open. Tell the host you are here.',
  manual_checkin: 'Check in at the host desk.',
  pairing_pending: 'You are checked in. Your pairing is being prepared.',
  live_round: 'Round 3 is on. Find your board.',
  awaiting_confirmation: 'Your opponent submitted a result. Confirm it or raise an issue.',
  between_rounds: 'Result saved. The next pairing is being prepared.',
  complete: 'Event complete. See your rating movement.',
  rating_pending: 'Event complete. Your rating update is being processed.',
}

function isConfirmed(ctx: PlayerContext, event: MockEventRef): boolean {
  return registrationsOf(ctx).some((reg) => reg.eventId === event.id && reg.status === 'confirmed')
}

/** The variant the room shows now: forced scenario (demo event only), else natural, then progress folded in. */
export function effectiveRoom(ctx: PlayerContext, event: MockEventRef): { variant: RoomVariant; nextAction: string } {
  let variant: RoomVariant = event.status === 'completed' ? 'complete' : 'before_checkin'
  const forced = ctx.state.scenario.room
  if (forced !== undefined && event.slug === ROOM_EVENT_SLUG) variant = forced
  if (variant === 'checkin_open' && ctx.state.room.checkedInAt !== null) variant = 'pairing_pending'
  return { variant, nextAction: NEXT_ACTION[variant] }
}

function checkInFor(ctx: PlayerContext, event: MockEventRef, variant: RoomVariant): CheckInDto {
  const progress = ctx.state.room
  switch (variant) {
    case 'before_checkin':
      return { status: 'not_open', opensAt: at(event, -30) }
    case 'checkin_open':
      return { status: 'open', closesAt: at(event, 15) }
    case 'manual_checkin':
      return { status: 'manual_required', reason: 'Check in at the host desk. The host will mark you present.' }
    case 'pairing_pending':
      return { status: 'checked_in', at: progress.checkedInAt ?? at(event, -12) }
    default:
      return { status: 'checked_in', at: at(event, -12) }
  }
}

function resultFor(ctx: PlayerContext, variant: RoomVariant): ResultDto {
  const progress = ctx.state.room
  if (variant === 'live_round' || variant === 'awaiting_confirmation') {
    if (progress.stage === 'final' && progress.finalOutcome !== null) {
      return { state: 'final', outcome: progress.finalOutcome }
    }
    if (progress.stage === 'submitted') return { state: 'submitted', submittedBy: 'me' }
    if (progress.stage === 'disputed') return { state: 'disputed', submittedBy: 'opponent' }
    if (variant === 'awaiting_confirmation') return { state: 'awaiting_confirmation', submittedBy: 'opponent' }
    return { state: 'none' }
  }
  if (variant === 'between_rounds') return { state: 'final', outcome: 'draw' }
  if (variant === 'complete' || variant === 'rating_pending') return { state: 'final', outcome: 'white' }
  return { state: 'none' }
}

function capsFor(ctx: PlayerContext, variant: RoomVariant, result: ResultDto): CapabilitiesDto {
  const checkIn = variant === 'checkin_open'
  const open = (variant === 'live_round' || variant === 'awaiting_confirmation') && ctx.state.room.stage !== 'final'
  return {
    ...NO_CAPS,
    canCheckIn: checkIn,
    canSubmitResult: variant === 'live_round' && result.state === 'none',
    canConfirmResult: open && result.state === 'awaiting_confirmation',
    canDispute: open && (result.state === 'awaiting_confirmation' || result.state === 'submitted'),
  }
}

function reasonsFor(variant: RoomVariant, caps: CapabilitiesDto, result: ResultDto) {
  const reasons: Partial<Record<'canCheckIn' | 'canSubmitResult' | 'canConfirmResult' | 'canDispute', string>> = {}
  if (!caps.canCheckIn) {
    reasons.canCheckIn =
      variant === 'manual_checkin' ? 'Check-in is at the host desk for this event.' : 'Check-in is not open right now.'
  }
  if (!caps.canSubmitResult) {
    reasons.canSubmitResult =
      result.state === 'none' ? 'Results open once your round is live.' : 'A result is already in for this game.'
  }
  if (!caps.canConfirmResult) reasons.canConfirmResult = 'There is no result waiting for you to confirm.'
  if (!caps.canDispute) reasons.canDispute = 'There is no result to raise an issue about.'
  return reasons
}

export function buildSnapshot(ctx: PlayerContext, event: MockEventRef): EventRoomSnapshotDto {
  const { variant } = effectiveRoom(ctx, event)
  const result = resultFor(ctx, variant)
  const capabilities = capsFor(ctx, variant, result)
  const base = {
    eventId: event.id,
    eventSlug: event.slug,
    title: event.title,
    venue: event.venue,
    startsAt: event.startsAt,
    serverNow: variant === 'before_checkin' && event.status !== 'completed' ? MOCK_NOW : at(event, CLOCK[variant]),
    version: Object.keys(CLOCK).indexOf(variant) * 1000 + ctx.state.room.version,
    checkIn: checkInFor(ctx, event, variant),
    capabilities,
    result,
    disabledReasons: reasonsFor(variant, capabilities, result),
  }
  switch (variant) {
    case 'before_checkin':
      return { ...base, roomState: 'before_checkin' }
    case 'checkin_open':
    case 'manual_checkin':
      return { ...base, roomState: 'checkin_open' }
    case 'pairing_pending':
      return { ...base, roomState: 'pairing_pending' }
    case 'live_round':
    case 'awaiting_confirmation':
      return {
        ...base,
        roomState: 'live_round',
        roundState: 'live',
        pairing: { ...MOCK_PAIRING, opponent: { ...MOCK_PAIRING.opponent } },
        bye: null,
        standings: [...MOCK_STANDINGS],
      }
    case 'between_rounds':
      return {
        ...base,
        roomState: 'between_rounds',
        score: { ...MOCK_SCORE_BETWEEN },
        standings: [...MOCK_STANDINGS],
        nextRoundAt: at(event, 120),
      }
    case 'complete':
    case 'rating_pending':
      return {
        ...base,
        roomState: 'complete',
        score: { ...MOCK_SCORE_FINAL },
        standings: [...MOCK_STANDINGS],
        ratingProcessing:
          variant === 'rating_pending'
            ? { status: 'pending' }
            : event.rated
              ? { status: 'complete', ...MOCK_ROOM_RATING }
              : { status: 'not_rated' },
      }
  }
}

function roomEvent(ctx: PlayerContext, eventId: string): MockEventRef {
  const event = eventRefById(eventId)
  if (event === undefined) throw notFound()
  if (!isConfirmed(ctx, event)) throw new ApiError('REGISTRATION_NOT_CONFIRMED', { status: 403 })
  return event
}

function touch(ctx: PlayerContext): void {
  ctx.state.room.version += 1
}

function update(ctx: PlayerContext, event: MockEventRef): ResultUpdateDto {
  const snapshot = buildSnapshot(ctx, event)
  return {
    result: snapshot.result,
    capabilities: snapshot.capabilities,
    serverNow: snapshot.serverNow,
    version: snapshot.version,
  }
}

function requireLive(ctx: PlayerContext, event: MockEventRef, pairingId: string, variant: RoomVariant): void {
  const room = effectiveRoom(ctx, event).variant
  if (pairingId !== MOCK_PAIRING_ID || room !== variant || ctx.state.room.stage !== 'none') {
    throw new ApiError('RESULT_NOT_ALLOWED', { status: 409 })
  }
}

export function createEventRoomGroup(runner: PlayerRunner, bearer: Bearer): PgEventRoomApi {
  return {
    getSnapshot: (eventId, opts) =>
      bearer(opts, (token) => runner.read(token, (ctx) => buildSnapshot(ctx, roomEvent(ctx, eventId)))),

    checkIn: (eventId, opts) =>
      bearer(opts, (token) =>
        runner.write(token, (ctx) => {
          const event = roomEvent(ctx, eventId)
          if (effectiveRoom(ctx, event).variant !== 'checkin_open') {
            throw new ApiError('CHECKIN_WINDOW_CLOSED', { status: 409 })
          }
          ctx.state.room.checkedInAt = toIso(ctx.nowMs)
          touch(ctx)
          const snapshot = buildSnapshot(ctx, event)
          return {
            checkIn: snapshot.checkIn,
            capabilities: snapshot.capabilities,
            serverNow: snapshot.serverNow,
            version: snapshot.version,
          }
        }),
      ),

    submitResult: (eventId, input, _key, opts) =>
      bearer(opts, (token) =>
        runner.write(token, (ctx) => {
          const event = roomEvent(ctx, eventId)
          requireLive(ctx, event, input.pairingId, 'live_round')
          ctx.state.room.stage = 'submitted'
          ctx.state.room.mine = input.outcome
          touch(ctx)
          return update(ctx, event)
        }),
      ),

    confirmResult: (eventId, pairingId, opts) =>
      bearer(opts, (token) =>
        runner.write(token, (ctx) => {
          const event = roomEvent(ctx, eventId)
          requireLive(ctx, event, pairingId, 'awaiting_confirmation')
          ctx.state.room.stage = 'final'
          ctx.state.room.finalOutcome = 'draw'
          touch(ctx)
          return update(ctx, event)
        }),
      ),

    disputeResult: (eventId, pairingId, _input, opts) =>
      bearer(opts, (token) =>
        runner.write(token, (ctx) => {
          const event = roomEvent(ctx, eventId)
          const room = effectiveRoom(ctx, event).variant
          const allowed =
            room === 'awaiting_confirmation' || (room === 'live_round' && ctx.state.room.stage === 'submitted')
          if (pairingId !== MOCK_PAIRING_ID || !allowed || ctx.state.room.stage === 'disputed') {
            throw new ApiError('RESULT_NOT_ALLOWED', { status: 409 })
          }
          ctx.state.room.stage = 'disputed'
          touch(ctx)
          return update(ctx, event)
        }),
      ),
  }
}
