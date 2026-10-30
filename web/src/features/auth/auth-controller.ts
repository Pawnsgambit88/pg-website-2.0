'use client'

import type { SessionEndedEvent, TokenManager } from '@/lib/api/browser/tokens'
import { isAbortError, isApiError } from '@/lib/api/errors'
import type { PgAuthApi } from '@/lib/api/pg-api'
import type { AuthResult, LoginInput, MeDto, RegisterInput } from '@/lib/api/types/auth'
import { readSessionHint } from '@/lib/auth/session-hint'
import { SIGNED_OUT_STATE, type AuthStore } from '@/features/auth/auth-store'
import { clearReturnTo, currentPath, rememberReturnTo, takeReturnTo } from '@/features/auth/return-to'

// The auth controller (TASK-023; ARCH-001 12.2 to 12.5): all session logic, no React. The AuthProvider creates one per
// mount and calls `start()` in an effect, so nothing here runs during a server render.
//
//   bootstrap   a stored session (role hint, or an access token already in memory after a client-side group change)
//               means: `GET /auth/me`. The browser client refreshes first when there is no access token (12.2), and the
//               TokenManager ends the session itself when the refresh is refused. No stored session: signed out, no
//               network call.
//   actions     login / register call the auth API, then hand the tokens to `TokenManager.setSession` (which writes the
//               role hint). logout is `TokenManager.logout()` (revoke, local wipe, cross-tab broadcast). refreshUser
//               re-reads `me`; the server's role is authoritative and goes back to the TokenManager and the hint.
//   session end every TokenManager session-ended event (expiry, reuse, role change, suspension, another tab) clears the
//               user. Unless the user signed out on purpose, the current path is recorded as the return-to intent so the
//               next sign-in returns there. The controller never navigates: guards and pages do (12.5).
//
// An epoch counter drops late results: a bootstrap answer that arrives after a login, logout or session end is ignored.

export interface SignInResult {
  user: MeDto
  /** The path recorded when the previous session ended, if any (single use, already validated by `safeReturnTo`). */
  returnTo: string | undefined
}

export interface AuthActions {
  /** Rejects with the API's `ApiError` (INVALID_CREDENTIALS, RATE_LIMITED, VALIDATION_FAILED...). State is unchanged then. */
  login: (credentials: LoginInput) => Promise<SignInResult>
  /** Rejects with the API's `ApiError` (EMAIL_TAKEN, WEAK_PASSWORD, VALIDATION_FAILED...). State is unchanged then. */
  register: (input: RegisterInput) => Promise<SignInResult>
  /** Never rejects. Revokes server-side (best effort), wipes local state and signs out the other tabs. */
  logout: () => Promise<void>
  /**
   * Re-reads `GET /auth/me`. Resolves the user, or `null` when there is no valid session (state becomes signed-out).
   * Other failures (offline, 5xx) keep the current status and user and set `error`; it never rejects.
   */
  refreshUser: () => Promise<MeDto | null>
}

export interface AuthControllerDeps {
  store: AuthStore
  /** `useApi().player.auth`. */
  auth: Pick<PgAuthApi, 'login' | 'register' | 'getMe'>
  /** Resolved lazily: the browser client throws on the server. */
  getTokens: () => TokenManager
}

export interface AuthController extends AuthActions {
  /** Subscribes to session-ended events and bootstraps. Returns the cleanup (unsubscribe and cancel the bootstrap). */
  start: () => () => void
}

function isNoSession(error: unknown): boolean {
  return isApiError(error) && (error.code === 'AUTH_REQUIRED' || error.status === 401)
}

export function createAuthController({ store, auth, getTokens }: AuthControllerDeps): AuthController {
  let epoch = 0

  const signedIn = (user: MeDto): void => {
    store.set({ status: 'signed-in', user, error: null })
  }

  const signedOut = (): void => {
    store.set(SIGNED_OUT_STATE)
  }

  function onSessionEnded(event: SessionEndedEvent): void {
    epoch += 1
    if (event.reason !== 'logout') {
      const path = currentPath()
      if (path !== undefined) rememberReturnTo(path)
    }
    signedOut() // the TokenManager already wiped the tokens and the role hint; QueryProvider clears the cache
  }

  /** `me` answered: the server's role wins (TokenManager drops a persisted admin refresh token, the hint follows). */
  function acceptUser(user: MeDto): MeDto {
    getTokens().updateRole(user.role)
    signedIn(user)
    return user
  }

  /**
   * `me` failed with "no valid session". Usually the refresh was refused and the TokenManager already ended the session
   * (and told the other tabs). Only when this tab still holds an access token the server rejected (401 after the one
   * replay) is the local session cleared here. Without that check, `clear()` would broadcast a sign-out to tabs that
   * still have a valid session (for example an admin tab whose refresh token lives only in its own memory).
   */
  function rejectSession(): void {
    const tokens = getTokens()
    if (tokens.getAccessToken() !== null) tokens.clear()
    signedOut()
  }

  async function readMe(signal: AbortSignal | undefined): Promise<MeDto | null> {
    const started = epoch
    try {
      const user = await auth.getMe(signal === undefined ? undefined : { signal })
      if (started !== epoch) return null
      return acceptUser(user)
    } catch (error) {
      if (isAbortError(error) || started !== epoch) return null
      if (isNoSession(error)) {
        rejectSession()
        return null
      }
      // Offline or server failure: the session may still be valid (the TokenManager keeps it on NETWORK). Keep the
      // current status and user; the guard shows a retry for `loading` + `error` (TASK-024).
      store.set({ ...store.getSnapshot(), error })
      return null
    }
  }

  function start(): () => void {
    const tokens = getTokens()
    const unsubscribe = tokens.subscribe(onSessionEnded)
    const controller = new AbortController()

    const hasStoredSession = tokens.getAccessToken() !== null || readSessionHint() !== null
    if (hasStoredSession) void readMe(controller.signal)
    else signedOut()

    return () => {
      controller.abort()
      unsubscribe()
    }
  }

  function establish(result: AuthResult): SignInResult {
    epoch += 1
    const { user, tokens: issued } = result
    getTokens().setSession({
      accessToken: issued.accessToken,
      refreshToken: 'refreshToken' in issued ? issued.refreshToken : undefined,
      role: user.role,
    })
    signedIn(user)
    return { user, returnTo: takeReturnTo() }
  }

  return {
    start,
    login: async (credentials) => establish(await auth.login(credentials)),
    register: async (input) => establish(await auth.register(input)),
    logout: async () => {
      epoch += 1
      await getTokens().logout()
      clearReturnTo() // a deliberate sign-out leaves no intent for the next user of this tab
      signedOut()
    },
    refreshUser: () => readMe(undefined),
  }
}
