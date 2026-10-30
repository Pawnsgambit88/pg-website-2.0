import { ApiError } from '@/lib/api/errors'
import {
  loginInputSchema,
  oauthExchangeInputSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerInputSchema,
  stepUpInputSchema,
  type AuthResult,
  type MeDto,
  type OauthStart,
  type TokenCookieBody,
  type TokenPairBody,
} from '@/lib/api/types/auth'
import { MOCK_SENTINEL } from '@/lib/mock/sentinel'
import { findByEmail, findById, isWeakPassword, normaliseEmail, passwordMatches, toMe } from '@/lib/mock/auth/accounts'
import { DEMO_PLAYER_EMAIL, DEMO_RESET_TOKEN, DEMO_RESET_TOKEN_EXPIRED } from '@/lib/mock/auth/demo-accounts'
import { authRequired, fieldFailure, invalidCredentials, parseInput, rateLimited } from '@/lib/mock/auth/errors'
import {
  ACCESS_TTL_MS,
  LOGIN_FAILURE_LIMIT,
  MAX_ACCOUNTS,
  OAUTH_CODE_TTL_MS,
  RESET_REQUEST_LIMIT,
  RESET_TOKEN_TTL_MS,
} from '@/lib/mock/auth/policy'
import { assertWithinLimit, clearHits, pruneHits, recordHit } from '@/lib/mock/auth/rate-limit'
import { fingerprint, opaqueToken, randomUuid } from '@/lib/mock/auth/random'
import {
  issueSession,
  issueStepUp,
  pruneSessions,
  revokeAllForAccount,
  revokeByAccess,
  revokeByRefresh,
  rotateRefresh,
  verifyAccess,
} from '@/lib/mock/auth/sessions'
import type { AuthState, AuthStateStore, MockAccount } from '@/lib/mock/auth/state'
import { assertBrowserStore, transact } from '@/lib/mock/auth/transact'

// The mock auth backend (TASK-021): contract endpoints A01 to A09 and POST /auth/step-up (backend contract 2.4, 3.2),
// behaving like the contract over the per-session store. Synchronous handlers; the PgApi adapter adds latency and error
// injection and the bearer, the mock AuthTransport adds the TokenManager wire shape.
// Nothing here logs. Error objects carry codes, statuses, closed reasons and field messages only (never a value sent).

export interface MockAuthServiceOptions {
  /** Browser session store. `null` (the server): reads answer AUTH_REQUIRED, writes MOCK_SERVER_MUTATION. */
  store: AuthStateStore | null
  /** Default Date.now. */
  now?: () => number
  /** Default ACCESS_TTL_MS. Lower it (for example 30 s) to watch the TokenManager refresh. */
  accessTtlMs?: number
  /** NEXT_PUBLIC_GOOGLE_AUTH. Off: OAuth start and exchange answer a clear "not enabled" error. */
  googleAuth: boolean
  /** Page origin for the OAuth callback URL. Default `window.location.origin`. */
  origin?: () => string
}

export interface MockAuthService {
  login: (input: unknown) => AuthResult
  register: (input: unknown) => AuthResult
  refresh: (refreshToken: string | undefined) => TokenPairBody
  logout: (refreshToken: string | undefined, accessToken: string | null) => void
  getMe: (accessToken: string | null) => MeDto
  requestPasswordReset: (input: unknown) => void
  confirmPasswordReset: (input: unknown) => void
  stepUp: (accessToken: string | null, input: unknown) => TokenCookieBody
  startGoogleSignIn: () => OauthStart
  exchangeOAuthCode: (input: unknown) => TokenPairBody
}

const PRUNE_WINDOW_MS = Math.max(LOGIN_FAILURE_LIMIT.windowMs, RESET_REQUEST_LIMIT.windowMs)

function googleNotEnabled(): ApiError {
  // INFERRED: the contract has no "feature disabled" code. A disabled route is a 404 on a real backend.
  return new ApiError('NOT_FOUND', {
    status: 404,
    detail: `${MOCK_SENTINEL} Google sign-in is not enabled (NEXT_PUBLIC_GOOGLE_AUTH is not "true")`,
  })
}

function windowOrigin(): string {
  if (typeof window === 'undefined') throw new ApiError('MOCK_SERVER_MUTATION', { status: 0 })
  return window.location.origin
}

export function createMockAuthService(options: MockAuthServiceOptions): MockAuthService {
  const { store, googleAuth } = options
  const now = options.now ?? Date.now
  const accessTtlMs = options.accessTtlMs ?? ACCESS_TTL_MS
  const origin = options.origin ?? windowOrigin

  /** A write request: prunes expired records, then runs the handler. */
  const write = <T>(handler: (state: AuthState, at: number) => T): T =>
    transact(store, 'write', (state) => {
      const at = now()
      pruneSessions(state, at)
      pruneHits(state, PRUNE_WINDOW_MS, at)
      return handler(state, at)
    })
  const read = <T>(handler: (state: AuthState, at: number) => T): T =>
    transact(store, 'read', (state) => handler(state, now()))

  const signIn = (state: AuthState, account: MockAccount, at: number): AuthResult => {
    const session = issueSession(state, account, accessTtlMs, at)
    return { user: toMe(account), tokens: session.tokens }
  }

  return {
    // A02. Same INVALID_CREDENTIALS (401) for an unknown email and a wrong password; failures are rate limited per
    // email (contract 2.10) whether or not the account exists.
    login(input) {
      assertBrowserStore(store, 'write')
      const { email, password } = parseInput(loginInputSchema, input)
      return write((state, at) => {
        assertWithinLimit(state, 'login', email, LOGIN_FAILURE_LIMIT, at)
        const account = findByEmail(state, email)
        if (account === undefined || !passwordMatches(account, password)) {
          recordHit(state, 'login', email, LOGIN_FAILURE_LIMIT, at)
          throw invalidCredentials()
        }
        if (account.status === 'suspended') throw authRequired('ACCOUNT_SUSPENDED')
        clearHits(state, 'login', email)
        return signIn(state, account, at)
      })
    },

    // A01. Field errors in envelope form: VALIDATION_FAILED, WEAK_PASSWORD (fields.password), EMAIL_TAKEN (fields.email).
    register(input) {
      assertBrowserStore(store, 'write')
      const data = parseInput(registerInputSchema, input)
      if (isWeakPassword(data.password, data.email)) {
        throw fieldFailure('WEAK_PASSWORD', 400, { password: ['Choose a less common password.'] })
      }
      return write((state, at) => {
        if (findByEmail(state, data.email) !== undefined) {
          throw fieldFailure('EMAIL_TAKEN', 409, { email: ['An account with this email already exists.'] })
        }
        if (state.accounts.length >= MAX_ACCOUNTS) throw rateLimited(60)
        const account: MockAccount = {
          id: randomUuid(),
          role: 'player',
          status: 'active',
          passwordFp: fingerprint(data.password),
          onboardingDone: false,
          playStyle: null,
          mood: null,
          ratings: [],
          profile: {
            name: data.name,
            email: normaliseEmail(data.email),
            city: data.city ?? null,
            area: null,
            phone: data.phone ?? null,
            birthday: null,
            chessComHandle: null,
            fideId: null,
            publicIdentity: {
              showDisplayName: true,
              showRatings: true,
              showChessComHandle: false,
              showCityChapter: true,
            },
          },
        }
        state.accounts.push(account)
        return signIn(state, account, at)
      })
    },

    // A03. Body mode only: a cookie-mode call (no token) has nothing to rotate.
    refresh(refreshToken) {
      if (refreshToken === undefined || refreshToken === '') throw authRequired()
      return write((state, at) => rotateRefresh(state, refreshToken, accessTtlMs, at))
    },

    // A04. Always succeeds, also for an unknown, used or already revoked token.
    logout(refreshToken, accessToken) {
      write((state, at) => {
        revokeByRefresh(state, refreshToken, at)
        revokeByAccess(state, accessToken ?? undefined, at)
      })
    },

    // A05.
    getMe(accessToken) {
      return read((state, at) => toMe(verifyAccess(state, accessToken, at)))
    },

    // A06. Neutral: the same void result for known and unknown emails; the rate limit applies to both alike.
    requestPasswordReset(input) {
      assertBrowserStore(store, 'write')
      const { email } = parseInput(passwordResetRequestSchema, input)
      write((state, at) => {
        assertWithinLimit(state, 'reset', email, RESET_REQUEST_LIMIT, at)
        recordHit(state, 'reset', email, RESET_REQUEST_LIMIT, at)
        const account = findByEmail(state, email)
        if (account !== undefined) state.reset = { accountId: account.id, issuedAt: at, usedAt: null }
      })
    },

    // A07. The "email link" token is the fixed demo token; it resets the account of the latest request, once, for 1 h.
    confirmPasswordReset(input) {
      assertBrowserStore(store, 'write')
      const { token, newPassword } = parseInput(passwordResetConfirmSchema, input)
      // Bad, used and expired links all answer the same RESET_TOKEN_INVALID (DEMO_RESET_TOKEN_EXPIRED is the demo of it).
      const invalid = () => new ApiError('RESET_TOKEN_INVALID', { status: 400 })
      if (token === DEMO_RESET_TOKEN_EXPIRED || token !== DEMO_RESET_TOKEN) throw invalid()
      write((state, at) => {
        const pending = state.reset
        if (pending === null || pending.usedAt !== null || at - pending.issuedAt >= RESET_TOKEN_TTL_MS) throw invalid()
        const account = findById(state, pending.accountId)
        if (account === undefined) throw invalid()
        if (isWeakPassword(newPassword, account.profile.email)) {
          throw fieldFailure('WEAK_PASSWORD', 400, { newPassword: ['Choose a less common password.'] })
        }
        account.passwordFp = fingerprint(newPassword)
        pending.usedAt = at
        revokeAllForAccount(state, account.id, at) // contract 2.4: reset revokes every refresh family
        clearHits(state, 'login', account.profile.email)
      })
    },

    // POST /auth/step-up. Authenticated; wrong password is INVALID_CREDENTIALS and rate limited like login.
    stepUp(accessToken, input) {
      assertBrowserStore(store, 'write')
      const { password } = parseInput(stepUpInputSchema, input)
      return write((state, at) => {
        const account = verifyAccess(state, accessToken, at)
        assertWithinLimit(state, 'step-up', account.profile.email, LOGIN_FAILURE_LIMIT, at)
        if (!passwordMatches(account, password)) {
          recordHit(state, 'step-up', account.profile.email, LOGIN_FAILURE_LIMIT, at)
          throw invalidCredentials()
        }
        return { accessToken: issueStepUp(state, account, at) }
      })
    },

    // A08. Flag-gated. Stands in for the provider round trip: the URL is the app's own callback with a one-time code
    // for the demo player, as the backend's A10 redirect would produce.
    startGoogleSignIn() {
      if (!googleAuth) throw googleNotEnabled()
      return write((state, at) => {
        const player = findByEmail(state, DEMO_PLAYER_EMAIL)
        if (player === undefined) throw authRequired()
        const code = opaqueToken('oc')
        state.oauthCodes.push({ fp: fingerprint(code), accountId: player.id, expiresAt: at + OAUTH_CODE_TTL_MS })
        const url = new URL('/auth/callback', origin())
        url.searchParams.set('code', code)
        return { url: url.toString() }
      })
    },

    // A09. Flag-gated. One-time code: unknown, used or expired is AUTH_REQUIRED.
    exchangeOAuthCode(input) {
      if (!googleAuth) throw googleNotEnabled()
      assertBrowserStore(store, 'write')
      const { code } = parseInput(oauthExchangeInputSchema, input)
      return write((state, at) => {
        const codeFp = fingerprint(code)
        const entry = state.oauthCodes.find((candidate) => candidate.fp === codeFp)
        state.oauthCodes = state.oauthCodes.filter((candidate) => candidate.fp !== codeFp)
        const account = entry === undefined || at >= entry.expiresAt ? undefined : findById(state, entry.accountId)
        if (account === undefined) throw authRequired()
        if (account.status === 'suspended') throw authRequired('ACCOUNT_SUSPENDED')
        return issueSession(state, account, accessTtlMs, at).tokens
      })
    },
  }
}
