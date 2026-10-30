import type { PgRatingApi } from '@/lib/api/pg-api'
import type { RatingProfileDto } from '@/lib/api/types/rating'
import type { Bearer } from '@/lib/mock/player/regs'
import type { PlayerRunner } from '@/lib/mock/player/context'
import { paginate } from '@/lib/mock/paginate'
import { ledgerFor, MOCK_RATING_PROFILE, trendFor } from '@/lib/mock/seeds/player-ratings'

// player.rating over the frozen seeds (TASK-019). `rating:empty` and every non-demo account show three unrated pools,
// an empty ledger and an empty trend. The ledger is append-only: nothing here writes.

const UNRATED: RatingProfileDto = Object.freeze({
  blitz: Object.freeze({ pool: 'blitz', state: 'unrated', games: 0 } as const),
  rapid: Object.freeze({ pool: 'rapid', state: 'unrated', games: 0 } as const),
  classical: Object.freeze({ pool: 'classical', state: 'unrated', games: 0 } as const),
})

export function createRatingGroup(runner: PlayerRunner, bearer: Bearer): PgRatingApi {
  return {
    getRatings: (opts) =>
      bearer(opts, (token) =>
        runner.read(token, (ctx) =>
          ctx.isDemo && ctx.state.scenario.rating !== 'empty' ? MOCK_RATING_PROFILE : UNRATED,
        ),
      ),
    getLedger: (pool, query, opts) =>
      bearer(opts, (token) =>
        runner.read(token, (ctx) =>
          paginate(ctx.isDemo && ctx.state.scenario.rating !== 'empty' ? ledgerFor(pool) : [], query),
        ),
      ),
    getTrend: (pool, query, opts) =>
      bearer(opts, (token) =>
        runner.read(token, (ctx) => {
          if (!ctx.isDemo || ctx.state.scenario.rating === 'empty') return []
          const days = query?.days ?? 90
          const cutoff = Date.parse('2026-10-23T09:00:00+05:30') - days * 86_400_000
          return trendFor(pool).filter((point) => Date.parse(point.at) >= cutoff)
        }),
      ),
  }
}
