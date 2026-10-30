import { ApiError } from '@/lib/api/errors'
import type { PgAuthApi, PgProfileApi, RequestOpts } from '@/lib/api/pg-api'
import { createMockAuthService, type MockAuthServiceOptions } from '@/lib/mock/auth/auth-service'
import { createMockProfileService } from '@/lib/mock/auth/profile-service'

// PgApi `player.auth` and `player.profile` over the mock auth and profile services (TASK-021).
// Authenticated methods get their bearer from a SESSION BRIDGE (in the browser: the app's TokenManager), and behave like
// lib/api/browser/client.ts: no usable access token -> refresh first; AUTH_REQUIRED without a reason -> refresh once and
// replay once. A failed refresh rejects with ApiError(AUTH_REQUIRED, reason) from the bridge. So the TokenManager's
// single-flight refresh, rotation storage and admin no-persist rule are exercised exactly as against a real backend.

export interface MockSessionBridge {
  /** In-memory access token, or null when absent or expired. */
  getAccessToken: () => string | null
  /** Single-flight refresh. Rejects with ApiError (AUTH_REQUIRED with reason, NETWORK, ...). */
  refresh: () => Promise<string>
}

export interface MockPlayerAuthOptions extends Omit<MockAuthServiceOptions, 'googleAuth'> {
  googleAuth?: boolean
  /** Absent: authenticated calls answer AUTH_REQUIRED (no session can exist). */
  session?: MockSessionBridge
}

/** Applies the mode's latency and failure injection before each call (adapter.ts `gate`). */
export type Gate = (opts?: RequestOpts) => Promise<unknown>

function isRefreshable(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'AUTH_REQUIRED' && error.reason === undefined
}

/** Shape of the bearer runner (`withBearer`), exposed so the player data groups share one refresh-and-replay path. */
export type BearerRunner = <T>(opts: RequestOpts | undefined, call: (token: string | null) => T) => Promise<T>

export function createMockPlayerAuth(
  options: MockPlayerAuthOptions,
  gate: Gate,
): { auth: PgAuthApi; profile: PgProfileApi; bearer: BearerRunner } {
  const service = createMockAuthService({ ...options, googleAuth: options.googleAuth ?? false })
  const profiles = createMockProfileService({ store: options.store, now: options.now })
  const { session } = options

  async function withBearer<T>(opts: RequestOpts | undefined, call: (token: string | null) => T): Promise<T> {
    await gate(opts)
    if (session === undefined) return call(null)
    const first = session.getAccessToken() ?? (await session.refresh())
    try {
      return call(first)
    } catch (error) {
      if (!isRefreshable(error)) throw error
      const fresh = await session.refresh()
      return call(fresh) // exactly one replay; a second AUTH_REQUIRED propagates
    }
  }

  const auth: PgAuthApi = {
    async login(input, opts) {
      await gate(opts)
      return service.login(input)
    },
    async register(input, opts) {
      await gate(opts)
      return service.register(input)
    },
    /** RAW endpoint (A03). The app refreshes through TokenManager.refresh(), which reaches the mock transport. */
    async refresh(input, opts) {
      await gate(opts)
      return service.refresh('refreshToken' in input ? input.refreshToken : undefined)
    },
    /** RAW endpoint (A04). Always resolves. */
    async logout(input, opts) {
      await gate(opts)
      service.logout('refreshToken' in input ? input.refreshToken : undefined, session?.getAccessToken() ?? null)
    },
    getMe(opts) {
      return withBearer(opts, (token) => service.getMe(token))
    },
    async requestPasswordReset(input, opts) {
      await gate(opts)
      service.requestPasswordReset(input)
    },
    async confirmPasswordReset(input, opts) {
      await gate(opts)
      service.confirmPasswordReset(input)
    },
    stepUp(input, opts) {
      return withBearer(opts, (token) => service.stepUp(token, input))
    },
    async startGoogleSignIn(opts) {
      await gate(opts)
      return service.startGoogleSignIn()
    },
    async exchangeOAuthCode(input, opts) {
      await gate(opts)
      return service.exchangeOAuthCode(input)
    },
  }

  const profile: PgProfileApi = {
    getProfile(opts) {
      return withBearer(opts, (token) => profiles.getProfile(token))
    },
    updateProfile(input, opts) {
      return withBearer(opts, (token) => profiles.updateProfile(token, input))
    },
    updatePublicIdentity(input, opts) {
      return withBearer(opts, (token) => profiles.updatePublicIdentity(token, input))
    },
    savePreferences(input, opts) {
      return withBearer(opts, (token) => profiles.savePreferences(token, input))
    },
  }

  return { auth, profile, bearer: withBearer }
}
