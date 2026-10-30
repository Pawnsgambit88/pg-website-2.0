import type { MeDto, UserRole } from '@/lib/api/types/auth'
import type { ProfileDto } from '@/lib/api/types/profile'
import { deepFreeze } from '@/lib/mock/seeds/freeze'

// Seeded demo accounts for the mock auth backend (TASK-021). Fictional people, reserved `.test` domain, one fixed demo
// password. These are FAKE credentials that only work against the mock adapter (NEXT_PUBLIC_USE_MOCKS=true); the mock
// never reaches a production build (check-build-output). Documented in lib/mock/README.md.
//
//   player@example.test  / pg-demo-1234   player, onboarding done, ratings
//   admin@example.test   / pg-demo-1234   admin (refresh token kept in memory by the TokenManager, 12 h cap)
//   new@example.test     / pg-demo-1234   player, first login: onboarding not done, profile incomplete
//
// Password reset: request a reset for a seeded or registered email, then confirm with token `demo-reset-token` (valid
// 1 hour, single use). `demo-reset-token-expired` always answers RESET_TOKEN_INVALID (the expired-link state).
// Google sign-in (flag NEXT_PUBLIC_GOOGLE_AUTH=true only): start issues a one-time code that signs in as the player.

export const DEMO_PASSWORD = 'pg-demo-1234'
export const DEMO_RESET_TOKEN = 'demo-reset-token'
export const DEMO_RESET_TOKEN_EXPIRED = 'demo-reset-token-expired'

export const DEMO_PLAYER_EMAIL = 'player@example.test'
export const DEMO_ADMIN_EMAIL = 'admin@example.test'
export const DEMO_NEW_USER_EMAIL = 'new@example.test'

/** Seed shape: everything an account holds except the password, which is always the demo password for seeds. */
export interface DemoAccountSeed {
  id: string
  role: UserRole
  onboardingDone: boolean
  ratings: MeDto['ratings']
  profile: ProfileDto
}

export const DEMO_ACCOUNTS: readonly DemoAccountSeed[] = deepFreeze([
  {
    id: 'a5e1d000-0000-4000-8000-000000000001',
    role: 'player',
    onboardingDone: true,
    ratings: [
      { pool: 'rapid', rating: 1286, games: 8, provisional: true },
      { pool: 'blitz', rating: 1198, games: 19, provisional: false },
    ],
    profile: {
      name: 'Asha Rao',
      email: DEMO_PLAYER_EMAIL,
      city: 'Bengaluru',
      area: 'Indiranagar',
      phone: '+91 90000 00001',
      birthday: null,
      chessComHandle: 'asha_plays',
      fideId: null,
      publicIdentity: { showDisplayName: true, showRatings: true, showChessComHandle: false, showCityChapter: true },
    },
  },
  {
    id: 'a5e1d000-0000-4000-8000-000000000002',
    role: 'admin',
    onboardingDone: true,
    ratings: [],
    profile: {
      name: 'Rohan Menon',
      email: DEMO_ADMIN_EMAIL,
      city: 'Bengaluru',
      area: null,
      phone: '+91 90000 00002',
      birthday: null,
      chessComHandle: null,
      fideId: null,
      publicIdentity: { showDisplayName: true, showRatings: true, showChessComHandle: false, showCityChapter: true },
    },
  },
  {
    id: 'a5e1d000-0000-4000-8000-000000000003',
    role: 'player',
    onboardingDone: false,
    ratings: [],
    profile: {
      name: 'Tara Singh',
      email: DEMO_NEW_USER_EMAIL,
      city: null,
      area: null,
      phone: null,
      birthday: null,
      chessComHandle: null,
      fideId: null,
      publicIdentity: { showDisplayName: true, showRatings: true, showChessComHandle: false, showCityChapter: true },
    },
  },
] satisfies DemoAccountSeed[])
