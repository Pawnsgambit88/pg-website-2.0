import { describe, expect, it } from 'vitest'
import { deriveCompleteHeadline, whatHappensNextSteps } from '@/features/player/event-room/room-state'
import type { RoomSnapshot } from '@/features/player/event-room/room-state'

// ---------- shared fixtures -------------------------------------------------

const CHECK_IN_NOT_OPEN = { status: 'not_open' as const, opensAt: '2026-10-24T04:00:00.000Z' as string }
const CHECK_IN_OPEN = { status: 'open' as const, closesAt: null }
const CHECK_IN_DONE = { status: 'checked_in' as const, at: '2026-10-24T04:00:00.000Z' as string }
const NO_CAPS = {
  canCheckIn: false,
  canSubmitResult: false,
  canConfirmResult: false,
  canDispute: false,
  canContactHost: true,
}
const RESULT = { state: 'none' as const }

const BASE = {
  eventId: '11111111-1111-4111-8111-111111111111' as string,
  eventSlug: 'spring-open' as string,
  title: 'Spring Open' as string,
  venue: 'The Courtyard' as string,
  startsAt: '2026-10-24T04:00:00.000Z' as string,
  serverNow: '2026-10-24T04:00:00.000Z' as string,
  version: 'v1' as string,
  capabilities: NO_CAPS,
  result: RESULT,
  disabledReasons: {},
}

const SCORE = { points: 1.5, roundsPlayed: 2, place: 8 }

function snap(
  roomState: RoomSnapshot['roomState'],
  checkIn: RoomSnapshot['checkIn'] = CHECK_IN_NOT_OPEN,
): RoomSnapshot {
  if (roomState === 'before_checkin') {
    return { ...BASE, roomState, checkIn } as unknown as RoomSnapshot
  }
  if (roomState === 'checkin_open') {
    return { ...BASE, roomState, checkIn } as unknown as RoomSnapshot
  }
  if (roomState === 'pairing_pending') {
    return { ...BASE, roomState, checkIn } as unknown as RoomSnapshot
  }
  if (roomState === 'live_round') {
    return {
      ...BASE,
      roomState,
      checkIn,
      roundState: 'live',
      pairing: null,
      bye: null,
      standings: [],
    } as unknown as RoomSnapshot
  }
  if (roomState === 'between_rounds') {
    return {
      ...BASE,
      roomState,
      checkIn,
      score: SCORE,
      standings: [],
      nextRoundAt: null,
    } as unknown as RoomSnapshot
  }
  // complete
  return {
    ...BASE,
    roomState: 'complete',
    checkIn,
    score: SCORE,
    standings: [],
    ratingProcessing: { status: 'not_rated' },
  } as unknown as RoomSnapshot
}

// ---------- whatHappensNextSteps -------------------------------------------

describe('whatHappensNextSteps', () => {
  it('before_checkin (not checked in): step 1 done, 2-4 pending', () => {
    expect(whatHappensNextSteps(snap('before_checkin'))).toEqual(['done', 'pending', 'pending', 'pending'])
  })

  it('checkin_open (not checked in): step 1 done, 2-4 pending', () => {
    expect(whatHappensNextSteps(snap('checkin_open', CHECK_IN_OPEN))).toEqual(['done', 'pending', 'pending', 'pending'])
  })

  it('pairing_pending (checked in): steps 1-2 done, 3-4 pending', () => {
    expect(whatHappensNextSteps(snap('pairing_pending', CHECK_IN_DONE))).toEqual(['done', 'done', 'pending', 'pending'])
  })

  it('pairing_pending (not checked in): step 2 still pending', () => {
    expect(whatHappensNextSteps(snap('pairing_pending', CHECK_IN_NOT_OPEN))[1]).toBe('pending')
  })

  it('live_round (checked in): steps 1-2 done, step 3 current, step 4 pending', () => {
    expect(whatHappensNextSteps(snap('live_round', CHECK_IN_DONE))).toEqual(['done', 'done', 'current', 'pending'])
  })

  it('between_rounds (checked in): steps 1-2 done, step 3 current, step 4 pending', () => {
    expect(whatHappensNextSteps(snap('between_rounds', CHECK_IN_DONE))).toEqual(['done', 'done', 'current', 'pending'])
  })

  it('complete: all 4 steps done regardless of checkIn', () => {
    expect(whatHappensNextSteps(snap('complete', CHECK_IN_DONE))).toEqual(['done', 'done', 'done', 'done'])
    expect(whatHappensNextSteps(snap('complete', CHECK_IN_NOT_OPEN))).toEqual(['done', 'done', 'done', 'done'])
  })

  it('step 2 "done" only when checkIn.status is checked_in', () => {
    expect(whatHappensNextSteps(snap('pairing_pending', CHECK_IN_DONE))[1]).toBe('done')
    expect(whatHappensNextSteps(snap('pairing_pending', CHECK_IN_OPEN))[1]).toBe('pending')
  })
})

// ---------- deriveCompleteHeadline ------------------------------------------

describe('deriveCompleteHeadline', () => {
  it('1 game singular', () => {
    expect(deriveCompleteHeadline(1)).toBe('1 game played. Well played.')
  })
  it('4 games plural', () => {
    expect(deriveCompleteHeadline(4)).toBe('4 games played. Well played.')
  })
  it('0 returns generic fallback', () => {
    expect(deriveCompleteHeadline(0)).toBe('All done. Thank you for playing.')
  })
  it('negative returns generic fallback', () => {
    expect(deriveCompleteHeadline(-1)).toBe('All done. Thank you for playing.')
  })
  it('non-integer returns generic fallback', () => {
    expect(deriveCompleteHeadline(1.5)).toBe('All done. Thank you for playing.')
    expect(deriveCompleteHeadline(Number.NaN)).toBe('All done. Thank you for playing.')
  })
})
