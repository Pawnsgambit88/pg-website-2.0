import { z } from 'zod'
import { ratingPoolSchema } from '@/lib/api/types/identity'
import { isoInstantSchema, slugSchema, uuidSchema } from '@/lib/api/types/primitives'

// Ratings (contract M10 to M12; UI-STATES "Player ratings"; EVENT-ENGINE "Rating finalisation").
// Three separate pools: blitz, rapid, classical. Volatility is never exposed. The ledger is append-only and a processed
// round never changes twice (ratings_processed_at gate on the server).

const rating = z.int().min(0).max(4000)
/** Rating deviation: lower means PG has more recent information (screen 30 explainer). */
const deviation = z.int().min(0).max(700)

/**
 * One pool. A discriminated union on `state` keeps "no games" apart from a real rating, so the UI renders the empty
 * state ("no games in a pool") without guessing from zeros.
 */
export const ratingPoolSummarySchema = z.discriminatedUnion('state', [
  z.object({ pool: ratingPoolSchema, state: z.literal('unrated'), games: z.literal(0) }),
  z.object({
    pool: ratingPoolSchema,
    state: z.literal('provisional'),
    rating,
    rd: deviation,
    games: z.int().min(1),
    lastChange: z.int().min(-1000).max(1000).nullable(),
  }),
  z.object({
    pool: ratingPoolSchema,
    state: z.literal('established'),
    rating,
    rd: deviation,
    games: z.int().min(1),
    lastChange: z.int().min(-1000).max(1000).nullable(),
  }),
])
export type RatingPoolSummary = z.infer<typeof ratingPoolSummarySchema>

/** `GET /me/ratings` (M10): exactly one summary per pool. */
export const ratingProfileSchema = z.object({
  blitz: ratingPoolSummarySchema.refine((p) => p.pool === 'blitz'),
  rapid: ratingPoolSummarySchema.refine((p) => p.pool === 'rapid'),
  classical: ratingPoolSummarySchema.refine((p) => p.pool === 'classical'),
})
export type RatingProfileDto = z.infer<typeof ratingProfileSchema>

export const GAME_OUTCOMES = ['win', 'draw', 'loss'] as const
export const gameOutcomeSchema = z.enum(GAME_OUTCOMES)
export type GameOutcome = z.infer<typeof gameOutcomeSchema>

const opponent = z.object({
  displayName: z.string().trim().min(1).max(80),
  initials: z.string().trim().min(1).max(3),
})

/** `GET /me/ratings/{pool}/ledger` rows (M11): append-only, newest first. Opponent is public identity only. */
export const ledgerEntrySchema = z.object({
  id: uuidSchema,
  pool: ratingPoolSchema,
  at: isoInstantSchema,
  outcome: gameOutcomeSchema,
  opponent,
  before: rating,
  after: rating,
  delta: z.int().min(-1000).max(1000),
  event: z.object({ slug: slugSchema, title: z.string().min(1).max(120) }),
})
export type LedgerEntryDto = z.infer<typeof ledgerEntrySchema>

export const trendPointSchema = z.object({ at: isoInstantSchema, rating })
/** `GET /me/ratings/{pool}/trend` (M12): bounded series. */
export const ratingTrendSchema = z.array(trendPointSchema).max(400)
export type RatingTrendDto = z.infer<typeof ratingTrendSchema>

export const trendQuerySchema = z.object({ days: z.int().min(7).max(365).optional() })
export type TrendQuery = z.infer<typeof trendQuerySchema>
