import type { AdminPairingDto, AdminRoundDto, EditPairingsInput } from '@/lib/api/types/admin/control-rounds'

// Pure state and derivation logic of the Pairings tab (FE-33). No React, no API calls: everything here is unit tested.

type GamePairing = Extract<AdminPairingDto, { kind: 'game' }>

/** The server answers this id for a player whose registration is gone. Such a seat cannot be moved. */
export const NO_REGISTRATION_ID = '00000000-0000-0000-0000-000000000000'

export interface DraftBoard {
  board: number
  white: string
  black: string
  /** A board with a result is read-only (the server refuses to change it). */
  locked: boolean
}

/** Local, unsaved arrangement of a round. Players are identified by registration id. */
export interface DraftModel {
  boards: readonly DraftBoard[]
  byes: readonly string[]
}

export function modelFromRound(round: Pick<AdminRoundDto, 'pairings'>): DraftModel {
  const boards: DraftBoard[] = []
  const byes: string[] = []
  for (const pairing of round.pairings) {
    if (pairing.kind === 'bye') {
      byes.push(pairing.player.registrationId)
    } else {
      boards.push({
        board: pairing.board,
        white: pairing.white.registrationId,
        black: pairing.black.registrationId,
        locked:
          pairing.result.state !== 'none' ||
          pairing.white.registrationId === NO_REGISTRATION_ID ||
          pairing.black.registrationId === NO_REGISTRATION_ID,
      })
    }
  }
  boards.sort((a, b) => a.board - b.board)
  return { boards, byes }
}

/** Is this player's seat movable in the model? (Not on a locked board, and has a registration.) */
export function isMovable(model: DraftModel, registrationId: string): boolean {
  if (registrationId === NO_REGISTRATION_ID) return false
  for (const board of model.boards) {
    if (board.white === registrationId || board.black === registrationId) return !board.locked
  }
  return model.byes.includes(registrationId)
}

/** Swaps the seats of two players (board slot or bye). Returns the same object when the swap is not allowed. */
export function swapPlayers(model: DraftModel, a: string, b: string): DraftModel {
  if (a === b || !isMovable(model, a) || !isMovable(model, b)) return model
  const swap = (id: string): string => (id === a ? b : id === b ? a : id)
  return {
    boards: model.boards.map((board) =>
      board.locked ? board : { ...board, white: swap(board.white), black: swap(board.black) },
    ),
    byes: model.byes.map(swap),
  }
}

/** Swaps white and black on one board (no effect on a locked or unknown board). */
export function flipColours(model: DraftModel, boardNo: number): DraftModel {
  const target = model.boards.find((board) => board.board === boardNo)
  if (target === undefined || target.locked) return model
  return {
    ...model,
    boards: model.boards.map((board) =>
      board.board === boardNo ? { ...board, white: board.black, black: board.white } : board,
    ),
  }
}

export function sameModel(a: DraftModel, b: DraftModel): boolean {
  return (
    a.boards.length === b.boards.length &&
    a.byes.length === b.byes.length &&
    a.boards.every((board, i) => {
      const other = b.boards[i]
      return (
        other !== undefined && board.board === other.board && board.white === other.white && board.black === other.black
      )
    }) &&
    a.byes.every((id, i) => id === b.byes[i])
  )
}

/** A round that was published or started takes a new round version on every edit, and then a reason is required. */
export function editPhase(round: Pick<AdminRoundDto, 'state'>): 'draft' | 'after_publish' {
  return round.state === 'draft' ? 'draft' : 'after_publish'
}

export type EditRequest = { ok: true; input: EditPairingsInput } | { ok: false; reasonMissing: true }

/** Builds the C08 body. After publish a blank reason is refused here (the server also requires it). */
export function buildEditInput(
  model: DraftModel,
  round: Pick<AdminRoundDto, 'state'>,
  version: number,
  reason: string,
): EditRequest {
  const boards = model.boards.map((board) => ({
    board: board.board,
    whiteRegistrationId: board.white,
    blackRegistrationId: board.black,
  }))
  const byes = model.byes.map((registrationId) => ({ registrationId }))
  const trimmed = reason.trim()
  if (editPhase(round) === 'draft') {
    return {
      ok: true,
      input: { phase: 'draft', version, boards, byes, ...(trimmed === '' ? {} : { reason: trimmed }) },
    }
  }
  if (trimmed === '') return { ok: false, reasonMissing: true }
  return { ok: true, input: { phase: 'after_publish', version, boards, byes, reason: trimmed } }
}

// ---------- Round selection and generation ----------

/** Round to show first: the one in play, else the newest (so the admin lands on the work that needs attention). */
export function defaultRoundId(rounds: readonly AdminRoundDto[]): string | null {
  if (rounds.length === 0) return null
  const open = rounds.findLast(
    (round) => round.state === 'live' || round.state === 'published' || round.state === 'draft',
  )
  return (open ?? rounds[rounds.length - 1])?.id ?? null
}

export interface GeneratePlan {
  /** The round number a Generate action would create or regenerate; null when none can be generated. */
  roundNo: number | null
  /** True when it replaces an existing draft. */
  regenerates: boolean
  /** Visible explanation when `roundNo` is null. */
  reason: string | null
}

const GENERATE_EVENT_STATUSES: readonly string[] = ['published', 'registration_open', 'sold_out', 'ongoing']

export function planGenerate(
  rounds: readonly AdminRoundDto[],
  eventStatus: string,
  roundsPlanned: number | null,
): GeneratePlan {
  if (!GENERATE_EVENT_STATUSES.includes(eventStatus)) {
    return {
      roundNo: null,
      regenerates: false,
      reason: 'Rounds can be generated once the event is published and until it ends.',
    }
  }
  const last = rounds.length === 0 ? undefined : rounds.reduce((a, b) => (b.roundNo > a.roundNo ? b : a))
  if (last === undefined) return { roundNo: 1, regenerates: false, reason: null }
  if (last.state === 'draft') return { roundNo: last.roundNo, regenerates: true, reason: null }
  if (last.state !== 'completed' && last.state !== 'void') {
    return {
      roundNo: null,
      regenerates: false,
      reason: `Finalise round ${String(last.roundNo)} before generating round ${String(last.roundNo + 1)}.`,
    }
  }
  const next = last.roundNo + 1
  if (roundsPlanned !== null && roundsPlanned > 0 && next > roundsPlanned) {
    return {
      roundNo: null,
      regenerates: false,
      reason: `All ${String(roundsPlanned)} planned round${roundsPlanned === 1 ? '' : 's'} have been played.`,
    }
  }
  return { roundNo: next, regenerates: false, reason: null }
}

// ---------- Results ----------

export type ResultAction = 'record' | 'override' | 'resolve'

/** What the admin can do to a game's result, from server capabilities. `null` when nothing is possible. */
export function resultActionFor(pairing: GamePairing): ResultAction | null {
  if (pairing.result.state === 'disputed') return pairing.capabilities.canResolveDispute.allowed ? 'resolve' : null
  if (!pairing.capabilities.canEnterResult.allowed) return null
  return pairing.result.state === 'final' ? 'override' : 'record'
}

export function disputedGames(round: Pick<AdminRoundDto, 'pairings'>): GamePairing[] {
  return round.pairings.filter(
    (pairing): pairing is GamePairing => pairing.kind === 'game' && pairing.result.state === 'disputed',
  )
}

export function gamesOf(round: Pick<AdminRoundDto, 'pairings'>): GamePairing[] {
  return round.pairings.filter((pairing): pairing is GamePairing => pairing.kind === 'game')
}

export function openResultCount(round: Pick<AdminRoundDto, 'pairings'>): number {
  return gamesOf(round).filter((pairing) => pairing.result.state !== 'final').length
}
