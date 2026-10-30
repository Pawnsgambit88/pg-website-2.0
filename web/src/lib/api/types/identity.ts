import { z } from 'zod'

// Public identity: the ONLY player data other players or visitors may see (contract 3.4 note, NCT-L1/L2, FEAT-000 OQ-26).
// The server applies the per-field visibility toggles before sending: a hidden name arrives as initials or "PG player".
// There is deliberately no id, email, phone, birthday or handle here.

export const RATING_POOLS = ['blitz', 'rapid', 'classical'] as const
export const ratingPoolSchema = z.enum(RATING_POOLS)
export type RatingPool = z.infer<typeof ratingPoolSchema>

export const publicIdentitySchema = z.object({
  /** Display name after the visibility toggle. Never empty. */
  displayName: z.string().trim().min(1).max(80),
  /** One to three letters for avatar tiles (also what is shown for minors without guardian consent, F-15). */
  initials: z.string().trim().min(1).max(3),
  /** Rating shown only when the player allows it; the pool says which. */
  rating: z.object({ pool: ratingPoolSchema, value: z.int().min(0).max(4000) }).nullable(),
  /** City chapter, when public. */
  cityChapter: z.string().trim().min(1).max(80).nullable(),
})
export type PublicIdentity = z.infer<typeof publicIdentitySchema>
