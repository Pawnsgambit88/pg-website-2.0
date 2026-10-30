import { z } from 'zod'
import { publicIdentitySchema, ratingPoolSchema } from '@/lib/api/types/identity'
import { isoInstantSchema, plainText, slugSchema, uuidSchema, versionSchema } from '@/lib/api/types/primitives'
import { standingsSchema } from '@/lib/api/types/standings'

// Event Room (contract M05 to M09; UI-STATES "Event attendance"; STATE-MACHINES "Round" and "Pairing result";
// ARCH-001 11.1 results flow, OQ-02). One snapshot per player. The UI renders from `capabilities` and `result`
// and never infers who may act. Only the caller's OWN pairing is returned, plus public standings.

// ---------- Room state (screens 24 to 29) ----------

export const ROOM_STATES = [
  'before_checkin',
  'checkin_open',
  'pairing_pending',
  'live_round',
  'between_rounds',
  'complete',
] as const
export const roomStateSchema = z.enum(ROOM_STATES)
export type RoomState = z.infer<typeof roomStateSchema>

/** Round lifecycle: draft -> published -> live -> completed; draft -> void. Players only ever see published or later. */
export const ROUND_STATES = ['draft', 'published', 'live', 'completed', 'void'] as const
export const roundStateSchema = z.enum(ROUND_STATES)
export type RoundState = z.infer<typeof roundStateSchema>

// ---------- Check-in ----------

/**
 * Check-in status. `manual_required` is "host/manual check-in required" (UI-STATES): the player cannot self check in and
 * the room shows the desk instruction. `checked_in` carries the time so the UI can show it without a second call.
 */
export const checkInSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not_open'), opensAt: isoInstantSchema }),
  z.object({ status: z.literal('open'), closesAt: isoInstantSchema.nullable() }),
  z.object({ status: z.literal('checked_in'), at: isoInstantSchema }),
  z.object({ status: z.literal('manual_required'), reason: plainText(200) }),
  z.object({ status: z.literal('closed') }),
])
export type CheckInDto = z.infer<typeof checkInSchema>

// ---------- Capability flags (contract 2.9) ----------

export const capabilitiesSchema = z.object({
  canCheckIn: z.boolean(),
  canSubmitResult: z.boolean(),
  canConfirmResult: z.boolean(),
  canDispute: z.boolean(),
  canContactHost: z.boolean(),
})
export type CapabilitiesDto = z.infer<typeof capabilitiesSchema>
export type Capability = keyof CapabilitiesDto

/** Which party performed the submission. `host` is an admin acting at the desk (no host role at launch). */
export const resultSubmitterSchema = z.enum(['me', 'opponent', 'host'])
export type ResultSubmitter = z.infer<typeof resultSubmitterSchema>

/** Pairing result: pending -> submitted -> final; submitted -> disputed -> final. `awaiting_confirmation` is submitted-by-other. */
export const resultSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('none') }),
  z.object({ state: z.literal('submitted'), submittedBy: resultSubmitterSchema }),
  z.object({ state: z.literal('awaiting_confirmation'), submittedBy: resultSubmitterSchema }),
  z.object({ state: z.literal('final'), outcome: z.enum(['white', 'black', 'draw']) }),
  z.object({ state: z.literal('disputed'), submittedBy: resultSubmitterSchema.optional() }),
])
export type ResultDto = z.infer<typeof resultSchema>
export type ResultState = ResultDto['state']

// ---------- Pairing ----------

export const COLOURS = ['white', 'black'] as const
export const colourSchema = z.enum(COLOURS)
export type Colour = z.infer<typeof colourSchema>

/** My pairing in the current published round. Colour is also text in the UI (never a swatch alone). */
export const pairingSchema = z.object({
  pairingId: uuidSchema,
  round: z.int().min(1).max(100),
  board: z.int().min(1).max(500),
  colour: colourSchema,
  opponent: publicIdentitySchema,
  timeControl: plainText(40),
})
export type PairingDto = z.infer<typeof pairingSchema>

/** Bye: no opponent and no result to submit. Modelled apart so `opponent` is never faked. */
export const byeSchema = z.object({ round: z.int().min(1).max(100) })

// ---------- Rating processing (UI-STATES "rating processing pending/complete") ----------

export const ratingProcessingSchema = z.discriminatedUnion('status', [
  /** Social or unrated events create no deltas (F-RATE-006). */
  z.object({ status: z.literal('not_rated') }),
  z.object({ status: z.literal('pending') }),
  z.object({
    status: z.literal('complete'),
    pool: ratingPoolSchema,
    before: z.int().min(0).max(4000),
    after: z.int().min(0).max(4000),
    delta: z.int().min(-1000).max(1000),
  }),
])
export type RatingProcessingDto = z.infer<typeof ratingProcessingSchema>

// ---------- Snapshot ----------

const roomBase = {
  eventId: uuidSchema,
  eventSlug: slugSchema,
  title: plainText(120),
  venue: plainText(200),
  startsAt: isoInstantSchema,
  /** Drives every countdown and window; the client never uses its own clock for decisions. */
  serverNow: isoInstantSchema,
  /** Cheap change-detection marker (OD-06 style). Equal marker means equal content. */
  version: versionSchema,
  checkIn: checkInSchema,
  capabilities: capabilitiesSchema,
  /** Result of MY current or most recent pairing. */
  result: resultSchema,
  /** Text reason per disabled capability (AC-84). Keys are capability names. */
  disabledReasons: z.partialRecord(
    z.enum(['canCheckIn', 'canSubmitResult', 'canConfirmResult', 'canDispute']),
    plainText(200),
  ),
}

const score = z.object({
  points: z.number().min(0).max(200).multipleOf(0.5),
  roundsPlayed: z.int().min(0).max(100),
  place: z.int().min(1).nullable(),
})

/**
 * `GET /me/events/{eventId}/room` (M05). A union on `roomState`: a live round always has a pairing, between rounds
 * always has my score and standings, and a complete room always has the rating-processing status.
 */
export const eventRoomSnapshotSchema = z.discriminatedUnion('roomState', [
  z.object({ ...roomBase, roomState: z.literal('before_checkin') }),
  z.object({ ...roomBase, roomState: z.literal('checkin_open') }),
  z.object({ ...roomBase, roomState: z.literal('pairing_pending') }),
  z.object({
    ...roomBase,
    roomState: z.literal('live_round'),
    roundState: z.enum(['published', 'live']),
    pairing: pairingSchema.nullable(),
    bye: byeSchema.nullable(),
    standings: standingsSchema,
  }),
  z.object({
    ...roomBase,
    roomState: z.literal('between_rounds'),
    score,
    standings: standingsSchema,
    nextRoundAt: isoInstantSchema.nullable(),
  }),
  z.object({
    ...roomBase,
    roomState: z.literal('complete'),
    score,
    standings: standingsSchema,
    ratingProcessing: ratingProcessingSchema,
  }),
])
export type EventRoomSnapshotDto = z.infer<typeof eventRoomSnapshotSchema>

// ---------- Commands ----------

/** `POST /me/events/{eventId}/check-in` (M06): the new check-in fragment, not the whole snapshot. */
export const checkInResultSchema = z.object({
  checkIn: checkInSchema,
  capabilities: capabilitiesSchema,
  serverNow: isoInstantSchema,
  version: versionSchema,
})
export type CheckInResultDto = z.infer<typeof checkInResultSchema>

export const RESULT_OUTCOMES = ['white', 'black', 'draw'] as const
export const resultOutcomeSchema = z.enum(RESULT_OUTCOMES)
export type ResultOutcome = z.infer<typeof resultOutcomeSchema>

/** `POST /me/events/{eventId}/results` (M07). Allowed only while `capabilities.canSubmitResult` is true. */
export const submitResultInputSchema = z.strictObject({ pairingId: uuidSchema, outcome: resultOutcomeSchema })
export type SubmitResultInput = z.infer<typeof submitResultInputSchema>

/** `POST .../results/{pairingId}/dispute` (M09). */
export const disputeResultInputSchema = z.strictObject({ note: z.string().trim().min(1).max(500).optional() })
export type DisputeResultInput = z.infer<typeof disputeResultInputSchema>

/** Responses of M07 to M09: the updated result and capability flags. */
export const resultUpdateSchema = z.object({
  result: resultSchema,
  capabilities: capabilitiesSchema,
  serverNow: isoInstantSchema,
  version: versionSchema,
})
export type ResultUpdateDto = z.infer<typeof resultUpdateSchema>
