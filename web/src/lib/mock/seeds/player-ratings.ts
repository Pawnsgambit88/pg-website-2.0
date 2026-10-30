import type { GameDto } from '@/lib/api/types/my-events'
import type { LedgerEntryDto, RatingProfileDto, RatingTrendDto } from '@/lib/api/types/rating'
import type { MeDto } from '@/lib/api/types/auth'
import { mockIstAt } from '@/lib/mock/seeds/clock'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { MOCK_OPPONENTS, type MockOpponentKey } from '@/lib/mock/seeds/player-people'

// Rating pools, ledger, trend and recent games for the demo player (screens 22 and 30). Blitz is established, Rapid
// provisional, Classical unrated. Only rapid and blitz have games. Ledger rows are append-only, newest first, and
// `before + delta = after` on every row. Immutable.

export const MOCK_RATING_PROFILE: RatingProfileDto = deepFreeze({
  rapid: { pool: 'rapid', state: 'provisional', rating: 1286, rd: 142, games: 8, lastChange: 18 },
  blitz: { pool: 'blitz', state: 'established', rating: 1198, rd: 88, games: 19, lastChange: -11 },
  classical: { pool: 'classical', state: 'unrated', games: 0 },
} satisfies RatingProfileDto)

/** `me.ratings` summary that matches the pools above (the auth seed keeps its own older numbers; this one is served by getRatings). */
export const MOCK_RATING_SUMMARY: MeDto['ratings'] = deepFreeze([
  { pool: 'rapid', rating: 1286, games: 8, provisional: true },
  { pool: 'blitz', rating: 1198, games: 19, provisional: false },
])

interface Row {
  n: number
  pool: 'rapid' | 'blitz'
  days: number
  time: string
  opponent: MockOpponentKey
  outcome: 'win' | 'draw' | 'loss'
  delta: number
  event: { slug: string; title: string }
}

const COFFEE = { slug: 'coffeehouse-rapid-sep', title: 'Coffeehouse Rapid' }
const SOCIAL = { slug: 'saturday-social', title: 'Saturday Social' }
const BLITZ = { slug: 'after-work-blitz', title: 'After Work Blitz' }
const MONSOON = { slug: 'monsoon-open', title: 'Monsoon Open' }

// Newest first. Rapid chain ends at 1286 and walks back through the deltas; blitz ends at 1198.
const ROWS: readonly Row[] = [
  { n: 1, pool: 'rapid', days: -6, time: '16:40', opponent: 'ananya', outcome: 'win', delta: 18, event: SOCIAL },
  { n: 2, pool: 'blitz', days: -9, time: '21:10', opponent: 'raghav', outcome: 'loss', delta: -11, event: BLITZ },
  { n: 3, pool: 'rapid', days: -17, time: '18:30', opponent: 'arjun', outcome: 'draw', delta: 2, event: COFFEE },
  { n: 4, pool: 'rapid', days: -21, time: '15:20', opponent: 'meera', outcome: 'loss', delta: -8, event: MONSOON },
  { n: 5, pool: 'rapid', days: -21, time: '13:05', opponent: 'aarav', outcome: 'win', delta: 14, event: MONSOON },
  { n: 6, pool: 'blitz', days: -30, time: '20:50', opponent: 'kabir', outcome: 'win', delta: 22, event: BLITZ },
  { n: 7, pool: 'rapid', days: -38, time: '17:15', opponent: 'ira', outcome: 'loss', delta: -6, event: COFFEE },
  { n: 8, pool: 'rapid', days: -52, time: '16:00', opponent: 'neha', outcome: 'win', delta: 9, event: SOCIAL },
  { n: 9, pool: 'rapid', days: -66, time: '17:45', opponent: 'aarav', outcome: 'win', delta: 12, event: MONSOON },
  { n: 10, pool: 'rapid', days: -80, time: '16:30', opponent: 'ananya', outcome: 'draw', delta: 1, event: COFFEE },
  { n: 11, pool: 'blitz', days: -45, time: '20:30', opponent: 'raghav', outcome: 'win', delta: 15, event: BLITZ },
  { n: 12, pool: 'blitz', days: -60, time: '20:10', opponent: 'kabir', outcome: 'loss', delta: -9, event: BLITZ },
  { n: 13, pool: 'blitz', days: -75, time: '20:40', opponent: 'neha', outcome: 'draw', delta: 3, event: BLITZ },
]

const SORTED = ROWS.toSorted((a, b) => mockIstAt(b.days, b.time).localeCompare(mockIstAt(a.days, a.time)))

// Walk back from the final rating of each pool so before/after chain exactly.
function build(): LedgerEntryDto[] {
  const finals = { rapid: 1286, blitz: 1198 }
  const after = { ...finals }
  return SORTED.map((row) => {
    const rowAfter = after[row.pool]
    const before = rowAfter - row.delta
    after[row.pool] = before
    const opponent = MOCK_OPPONENTS[row.opponent]
    return {
      id: `c5e1d000-0000-4000-8000-0000000001${String(row.n).padStart(2, '0')}`,
      pool: row.pool,
      at: mockIstAt(row.days, row.time),
      outcome: row.outcome,
      opponent: { displayName: opponent.displayName, initials: opponent.initials },
      before,
      after: rowAfter,
      delta: row.delta,
      event: { slug: row.event.slug as LedgerEntryDto['event']['slug'], title: row.event.title },
    }
  })
}

export const MOCK_LEDGER: readonly LedgerEntryDto[] = deepFreeze(build())

export function ledgerFor(pool: 'rapid' | 'blitz' | 'classical'): LedgerEntryDto[] {
  return MOCK_LEDGER.filter((entry) => entry.pool === pool)
}

/** Trend points per pool, oldest first, derived from the ledger (one point per movement plus the starting rating). */
export function trendFor(pool: 'rapid' | 'blitz' | 'classical'): RatingTrendDto {
  const rows = ledgerFor(pool).toReversed()
  const first = rows[0]
  if (first === undefined) return []
  return [
    { at: mockIstAt(-90, '09:00'), rating: first.before },
    ...rows.map((row) => ({ at: row.at, rating: row.after })),
  ]
}

const GAME_ROWS = SORTED.slice(0, 5)

/** Recent games (M02): the five newest ledger rows, as the dashboard lists them. Unrated play has a null delta. */
const GAMES: GameDto[] = [
  ...GAME_ROWS.map((row) => ({
    id: `d5e1d000-0000-4000-8000-0000000001${String(row.n).padStart(2, '0')}`,
    outcome: row.outcome,
    pool: row.pool,
    opponent: MOCK_OPPONENTS[row.opponent],
    ratingDelta: row.delta,
    eventTitle: row.event.title,
    playedAt: mockIstAt(row.days, row.time),
  })),
  {
    id: 'd5e1d000-0000-4000-8000-000000000199',
    outcome: 'win',
    pool: 'rapid',
    opponent: MOCK_OPPONENTS.dev,
    ratingDelta: null,
    eventTitle: 'Saturday Social',
    playedAt: mockIstAt(-13, '17:30'),
  },
]

export const MOCK_GAMES: readonly GameDto[] = deepFreeze(GAMES.toSorted((a, b) => b.playedAt.localeCompare(a.playedAt)))
