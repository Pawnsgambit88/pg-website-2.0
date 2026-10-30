import { z } from 'zod'
import { MOODS, PLAY_STYLES, meSchema, userRoleSchema } from '@/lib/api/types/auth'
import { authFailureReasonSchema } from '@/lib/api/types/error-codes'
import { profileSchema } from '@/lib/api/types/profile'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/mock/auth/demo-accounts'
import { MAX_ACCESS_RECORDS, MAX_ACCOUNTS, MAX_FAMILIES, MAX_USED_PER_FAMILY } from '@/lib/mock/auth/policy'
import { fingerprint } from '@/lib/mock/auth/random'

// The mock auth "server database" (TASK-021; ARCH-001 11.4). This file only DESCRIBES it: the schema, the seed-derived
// initial value and the store interface. The value itself lives in sessionStorage (auth/store.browser.ts) and is read,
// changed and written back on every call; nothing is held at module level, and the server has no store at all.
// Tokens, codes and passwords are kept as fingerprints. The one exception is the refresh token issued by the latest
// rotation, kept for the 10 s grace window only so a replay can return the same pair (contract 2.4).

const fp = z.string().regex(/^[0-9a-f]{16}$/)
const time = z.int().min(0)
const id = z.string().min(1).max(64)

export const accountSchema = z.object({
  id,
  role: userRoleSchema,
  status: z.enum(['active', 'suspended']),
  passwordFp: fp,
  onboardingDone: z.boolean(),
  playStyle: z.enum(PLAY_STYLES).nullable(),
  mood: z.enum(MOODS).nullable(),
  ratings: meSchema.shape.ratings,
  profile: profileSchema,
})
export type MockAccount = z.infer<typeof accountSchema>

export const familyEndSchema = z.union([z.literal('logout'), authFailureReasonSchema])
export type FamilyEnd = z.infer<typeof familyEndSchema>

/** One refresh-token family = one sign-in. Rotation replaces `currentFp`; every presented token moves to `usedFps`. */
export const familySchema = z.object({
  id,
  accountId: id,
  /** Role at sign-in. A different role on refresh ends the family with ROLE_CHANGED (contract 2.4). */
  role: userRoleSchema,
  createdAt: time,
  lastUsedAt: time,
  currentFp: fp,
  usedFps: z.array(fp).max(MAX_USED_PER_FAMILY),
  /** The pair issued for the token in `fp`, replayed unchanged until `until` (contract 2.4 grace window). */
  grace: z
    .object({ fp, until: time, accessToken: z.string().min(1).max(128), refreshToken: z.string().min(1).max(128) })
    .nullable(),
  revokedAt: time.nullable(),
  revokedReason: familyEndSchema.nullable(),
})
export type MockFamily = z.infer<typeof familySchema>

export const accessSchema = z.object({
  fp,
  accountId: id,
  familyId: id.nullable(),
  kind: z.enum(['access', 'step_up']),
  expiresAt: time,
})
export type MockAccess = z.infer<typeof accessSchema>

export const authStateSchema = z.object({
  accounts: z.array(accountSchema).max(MAX_ACCOUNTS + DEMO_ACCOUNTS.length),
  families: z.array(familySchema).max(MAX_FAMILIES * 2),
  access: z.array(accessSchema).max(MAX_ACCESS_RECORDS * 2),
  /** The latest password-reset request (the demo token resets this account). */
  reset: z.object({ accountId: id, issuedAt: time, usedAt: time.nullable() }).nullable(),
  oauthCodes: z.array(z.object({ fp, accountId: id, expiresAt: time })).max(20),
  /** Rate-limit hit times by `<scope>:<email fingerprint>`. */
  hits: z.record(z.string().max(64), z.array(time).max(20)),
})
export type AuthState = z.infer<typeof authStateSchema>

/** Read returns a FRESH object each call (parsed from storage or rebuilt from seeds); write persists it. */
export interface AuthStateStore {
  read: () => AuthState
  write: (state: AuthState) => void
}

/** A fresh state from the frozen seeds. Seed passwords are the fixed demo password. */
export function initialAuthState(): AuthState {
  const passwordFp = fingerprint(DEMO_PASSWORD)
  return {
    accounts: DEMO_ACCOUNTS.map((seed) => ({
      id: seed.id,
      role: seed.role,
      status: 'active' as const,
      passwordFp,
      onboardingDone: seed.onboardingDone,
      playStyle: null,
      mood: null,
      ratings: seed.ratings.map((entry) => ({ ...entry })),
      profile: { ...seed.profile, publicIdentity: { ...seed.profile.publicIdentity } },
    })),
    families: [],
    access: [],
    reset: null,
    oauthCodes: [],
    hits: {},
  }
}

export function parseAuthState(value: unknown): AuthState | null {
  const result = authStateSchema.safeParse(value)
  return result.success ? result.data : null
}
