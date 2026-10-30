import { RATING_POOLS, type RatingPool } from '@/lib/api/types/identity'
import type { RatingPoolSummary, RatingProfileDto } from '@/lib/api/types/rating'

export const POOL_LABEL: Readonly<Record<RatingPool, string>> = {
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
}

/** The three summaries in fixed order (never blended into one number). */
export function poolSummaries(profile: RatingProfileDto): RatingPoolSummary[] {
  return RATING_POOLS.map((pool) => profile[pool])
}

/** Opens on the pool with the most games; Rapid when nothing is rated yet (the most common PG format). */
export function defaultPool(profile: RatingProfileDto): RatingPool {
  let best: RatingPool = 'rapid'
  let games = 0
  for (const summary of poolSummaries(profile)) {
    if (summary.games > games) {
      best = summary.pool
      games = summary.games
    }
  }
  return best
}

export function hasAnyRatedGames(profile: RatingProfileDto): boolean {
  return poolSummaries(profile).some((summary) => summary.games > 0)
}

/** Short plain-language line for the pool selector option. */
export function poolOptionHint(summary: RatingPoolSummary): string {
  return summary.state === 'unrated'
    ? 'Unrated'
    : `${summary.rating}${summary.state === 'provisional' ? ' · Provisional' : ''}`
}
