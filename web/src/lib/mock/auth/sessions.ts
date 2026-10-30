import type { TokenPairBody } from '@/lib/api/types/auth'
import type { AuthFailureReason } from '@/lib/api/types/error-codes'
import { findById } from '@/lib/mock/auth/accounts'
import { authRequired } from '@/lib/mock/auth/errors'
import {
  ADMIN_SESSION_ABSOLUTE_MS,
  MAX_ACCESS_RECORDS,
  MAX_FAMILIES,
  MAX_USED_PER_FAMILY,
  PLAYER_SESSION_SLIDING_MS,
  REFRESH_GRACE_MS,
  REVOKED_FAMILY_RETENTION_MS,
  STEP_UP_TTL_MS,
} from '@/lib/mock/auth/policy'
import { fingerprint, opaqueToken, randomUuid } from '@/lib/mock/auth/random'
import type { AuthState, FamilyEnd, MockAccount, MockFamily } from '@/lib/mock/auth/state'

// Token lifecycle of the mock auth backend (backend contract 2.4; ARCH-001 12.1, 12.3; SEC-001 F-02). Pure functions that
// change the state value they are given; the caller persists it. Behaviour imitated:
//   - opaque access token (short TTL) + single-use rotating refresh token, both random, never JWTs;
//   - one FAMILY per sign-in; each refresh invalidates the presented token immediately and issues a new pair;
//   - replay of the immediately previous token within 10 s returns the SAME new pair (lost response at a venue);
//   - any other replay of a used token revokes the whole family: AUTH_REQUIRED reason REFRESH_REUSED;
//   - player sessions slide 14 days, admin sessions end 12 h after sign-in: AUTH_REQUIRED reason SESSION_EXPIRED;
//   - role and status re-read on every refresh: ROLE_CHANGED / ACCOUNT_SUSPENDED end the family;
//   - logout revokes the family and always succeeds; a password reset revokes every family of the account.

export interface IssuedSession {
  account: MockAccount
  tokens: TokenPairBody
}

function addAccess(state: AuthState, accountId: string, familyId: string | null, ttlMs: number, now: number): string {
  const kind = familyId === null ? 'step_up' : 'access'
  const token = opaqueToken(kind === 'access' ? 'at' : 'su')
  state.access.push({ fp: fingerprint(token), accountId, familyId, kind, expiresAt: now + ttlMs })
  return token
}

function dropAccessOfFamily(state: AuthState, familyId: string): void {
  state.access = state.access.filter((record) => record.familyId !== familyId)
}

function revokeFamily(state: AuthState, family: MockFamily, reason: FamilyEnd, now: number): void {
  if (family.revokedAt === null) {
    family.revokedAt = now
    family.revokedReason = reason
  }
  family.grace = null
  dropAccessOfFamily(state, family.id)
}

/** Creates a family and its first token pair (login, register, OAuth exchange). */
export function issueSession(state: AuthState, account: MockAccount, accessTtlMs: number, now: number): IssuedSession {
  const refreshToken = opaqueToken('rt')
  const family: MockFamily = {
    id: randomUuid(),
    accountId: account.id,
    role: account.role,
    createdAt: now,
    lastUsedAt: now,
    currentFp: fingerprint(refreshToken),
    usedFps: [],
    grace: null,
    revokedAt: null,
    revokedReason: null,
  }
  state.families.push(family)
  const accessToken = addAccess(state, account.id, family.id, accessTtlMs, now)
  return { account, tokens: { accessToken, refreshToken } }
}

function findFamily(state: AuthState, tokenFp: string): MockFamily | undefined {
  return state.families.find(
    (family) => family.currentFp === tokenFp || family.grace?.fp === tokenFp || family.usedFps.includes(tokenFp),
  )
}

/** The reason a revoked family reports. A plain logout reports none (the token is simply no longer valid). */
function endReason(family: MockFamily): AuthFailureReason | undefined {
  return family.revokedReason === null || family.revokedReason === 'logout' ? undefined : family.revokedReason
}

function expiredReason(state: AuthState, family: MockFamily, now: number): AuthFailureReason | null {
  const account = findById(state, family.accountId)
  if (account === undefined) return 'SESSION_EXPIRED'
  if (account.status === 'suspended') return 'ACCOUNT_SUSPENDED'
  if (account.role !== family.role) return 'ROLE_CHANGED'
  const ended =
    family.role === 'admin'
      ? now - family.createdAt >= ADMIN_SESSION_ABSOLUTE_MS
      : now - family.lastUsedAt >= PLAYER_SESSION_SLIDING_MS
  return ended ? 'SESSION_EXPIRED' : null
}

/** `POST /auth/refresh` (A03): rotation with reuse detection. Throws AUTH_REQUIRED (with a reason) on failure. */
export function rotateRefresh(state: AuthState, refreshToken: string, accessTtlMs: number, now: number): TokenPairBody {
  const tokenFp = fingerprint(refreshToken)
  const family = findFamily(state, tokenFp)
  if (family === undefined) throw authRequired()
  if (family.revokedAt !== null) throw authRequired(endReason(family))

  // Grace: the token rotated a moment ago is presented again (the response was lost). Same pair, no new rotation.
  if (family.grace !== null && family.grace.fp === tokenFp && family.currentFp !== tokenFp) {
    if (now < family.grace.until) {
      return { accessToken: family.grace.accessToken, refreshToken: family.grace.refreshToken }
    }
  }

  if (family.currentFp !== tokenFp) {
    // A used token outside the grace window: assume theft, revoke the whole family (contract 2.4, F-02).
    revokeFamily(state, family, 'REFRESH_REUSED', now)
    throw authRequired('REFRESH_REUSED')
  }

  const ended = expiredReason(state, family, now)
  if (ended !== null) {
    revokeFamily(state, family, ended, now)
    throw authRequired(ended)
  }

  const next = opaqueToken('rt')
  const accessToken = addAccess(state, family.accountId, family.id, accessTtlMs, now)
  family.usedFps = [...family.usedFps, tokenFp].slice(-MAX_USED_PER_FAMILY)
  family.grace = { fp: tokenFp, until: now + REFRESH_GRACE_MS, accessToken, refreshToken: next }
  family.currentFp = fingerprint(next)
  family.lastUsedAt = now
  return { accessToken, refreshToken: next }
}

/** `POST /auth/logout` (A04): revokes the family of any token it ever issued. Unknown or missing token: no-op. */
export function revokeByRefresh(state: AuthState, refreshToken: string | undefined, now: number): void {
  if (refreshToken === undefined) return
  const family = findFamily(state, fingerprint(refreshToken))
  if (family !== undefined) revokeFamily(state, family, 'logout', now)
}

/** Logout by access token (cookie-mode style, no body): revokes the caller's family if the token is known. */
export function revokeByAccess(state: AuthState, accessToken: string | undefined, now: number): void {
  if (accessToken === undefined) return
  const record = state.access.find((entry) => entry.fp === fingerprint(accessToken))
  const family = record?.familyId == null ? undefined : state.families.find((f) => f.id === record.familyId)
  if (family !== undefined) revokeFamily(state, family, 'logout', now)
}

/** Password reset or change: every family of the account ends (contract 2.4). */
export function revokeAllForAccount(state: AuthState, accountId: string, now: number): void {
  for (const family of state.families) {
    if (family.accountId === accountId) revokeFamily(state, family, 'SESSION_EXPIRED', now)
  }
  state.access = state.access.filter((record) => record.accountId !== accountId)
}

/**
 * Bearer check for every authenticated mock call: AUTH_REQUIRED (401, no reason) for a missing, unknown or expired
 * access token, which is exactly what makes the browser client refresh and replay. A step-up token is not an access
 * token here: it is accepted only by `consumeStepUp`.
 */
export function verifyAccess(state: AuthState, accessToken: string | null, now: number): MockAccount {
  if (accessToken === null) throw authRequired()
  const record = state.access.find((entry) => entry.fp === fingerprint(accessToken) && entry.kind === 'access')
  if (record === undefined || now >= record.expiresAt) throw authRequired()
  const family = state.families.find((entry) => entry.id === record.familyId)
  if (family === undefined || family.revokedAt !== null) throw authRequired()
  const account = findById(state, record.accountId)
  if (account === undefined) throw authRequired()
  if (account.status === 'suspended') throw authRequired('ACCOUNT_SUSPENDED')
  return account
}

/** `POST /auth/step-up`: a fresh token valid 5 minutes for one sensitive operation. Not linked to a family. */
export function issueStepUp(state: AuthState, account: MockAccount, now: number): string {
  return addAccess(state, account.id, null, STEP_UP_TTL_MS, now)
}

/**
 * For the admin mock (TASK-019/020): `true` when `token` is a live step-up token of `accountId`; `false` means the
 * caller answers STEP_UP_REQUIRED (401). Single use: the token is removed whether or not the operation then succeeds.
 */
export function consumeStepUp(state: AuthState, token: string | null, accountId: string, now: number): boolean {
  if (token === null) return false
  const tokenFp = fingerprint(token)
  const index = state.access.findIndex((entry) => entry.fp === tokenFp && entry.kind === 'step_up')
  const record = index === -1 ? undefined : state.access[index]
  if (record === undefined) return false
  state.access.splice(index, 1)
  return record.accountId === accountId && now < record.expiresAt
}

/** Keeps the session store small and drops expired secrets (grace pairs, access records, codes). */
export function pruneSessions(state: AuthState, now: number): void {
  state.access = state.access.filter((record) => now < record.expiresAt).slice(-MAX_ACCESS_RECORDS)
  state.oauthCodes = state.oauthCodes.filter((code) => now < code.expiresAt)
  for (const family of state.families) {
    if (family.grace !== null && now >= family.grace.until) family.grace = null
  }
  const kept = state.families.filter(
    (family) => family.revokedAt === null || now - family.revokedAt < REVOKED_FAMILY_RETENTION_MS,
  )
  const live = kept.filter((family) => family.revokedAt === null)
  // Oldest live families beyond the cap are revoked (a session store this full is a runaway test, not a person).
  for (const family of live.slice(0, Math.max(0, live.length - MAX_FAMILIES))) {
    revokeFamily(state, family, 'SESSION_EXPIRED', now)
  }
  state.families = kept.slice(-MAX_FAMILIES * 2)
}
