import type { PairingDto } from '@/lib/api/types/event-room'
import type { StandingRow } from '@/lib/api/types/standings'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { MOCK_OPPONENTS, MOCK_PLAYER_IDENTITY } from '@/lib/mock/seeds/player-people'

// Event Room seed data (screens 24 to 29): the demo player's pairing in round 3 and the standings. Immutable. The six
// room snapshots are assembled from these by lib/mock/player/room.ts, because their capabilities, result and check-in
// depend on the session (check-in done, result submitted).

export const MOCK_PAIRING_ID = 'b5e1d000-0000-4000-8000-000000000001'

/** Round 3, board 7: the player has white against Aarav Menon (screen 27). */
export const MOCK_PAIRING: PairingDto = deepFreeze({
  pairingId: MOCK_PAIRING_ID,
  round: 3,
  board: 7,
  colour: 'white',
  opponent: MOCK_OPPONENTS.aarav,
  timeControl: '10+3',
})

const row = (
  place: number,
  identity: StandingRow['identity'],
  score: number,
  rounds: number,
  value: number | null,
): StandingRow => ({
  place,
  identity,
  score,
  rounds,
  rating: value === null ? null : { pool: 'rapid', value },
})

/** Standings while play is on (public projection). The player is 8th on 1.5 / 2, as screen 28 shows. */
export const MOCK_STANDINGS: readonly StandingRow[] = deepFreeze([
  row(1, MOCK_OPPONENTS.ira, 2, 2, 1540),
  row(2, MOCK_OPPONENTS.arjun, 2, 2, 1301),
  row(3, MOCK_OPPONENTS.aarav, 1.5, 2, 1318),
  row(4, MOCK_OPPONENTS.ananya, 1.5, 2, 1254),
  row(5, MOCK_OPPONENTS.kabir, 1.5, 2, 1222),
  row(6, MOCK_OPPONENTS.meera, 1.5, 2, 1190),
  row(7, MOCK_OPPONENTS.neha, 1.5, 2, null),
  row(8, MOCK_PLAYER_IDENTITY, 1.5, 2, 1286),
  row(9, MOCK_OPPONENTS.dev, 1, 2, null),
  row(10, MOCK_OPPONENTS.raghav, 0.5, 2, null),
])

/** The player's own score for between rounds (after 2 of 4 rounds) and for the final table. */
export const MOCK_SCORE_BETWEEN = deepFreeze({ points: 1.5, roundsPlayed: 2, place: 8 })
export const MOCK_SCORE_FINAL = deepFreeze({ points: 3, roundsPlayed: 4, place: 3 })

/** Rating movement shown on the complete room (screen 29): 1265 to 1286. */
export const MOCK_ROOM_RATING = deepFreeze({ pool: 'rapid', before: 1265, after: 1286, delta: 21 } as const)
