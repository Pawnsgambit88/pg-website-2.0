'use client'

import type { z } from 'zod'
import { configureTokens, CSRF_BOOTSTRAP_VALUE, type TokenManager } from '@/lib/api/browser/tokens'
import { createStepUp, type StepUp } from '@/lib/api/browser/step-up'
import { TokenError, type AuthTransport } from '@/lib/api/browser/auth-transport'
import { createFetchAuthTransport } from '@/lib/api/browser/transport'
import { ApiError, createAbortError, isAbortError } from '@/lib/api/errors'
import { sendRequest, type FetchLike } from '@/lib/api/http'
import type { ApiRequester, RequestSpec } from '@/lib/api/requester'
import { isSameOrigin, resolveApiUrl } from '@/lib/api/url'
import { envPublic } from '@/lib/env/env.public'

// Browser client (ARCH-001 11.6, 12.3; TASK-014; SEC-001 F-10, F-16). Every authenticated call from a client island goes
// through here. Behaviour:
//   - base URL is NEXT_PUBLIC_API_BASE_URL (relative, default /api); the request is built from a relative path only and
//     rejected unless it resolves to `location.origin`. A backend-supplied URL (pagination `next`, redirect) can never
//     become a request, so `Authorization` can never reach another host (F-16);
//   - `auth: true`: bearer from the token manager (in-memory access token); a missing/expired token refreshes first; a 401
//     joins the single-flight refresh (one shared promise for ten concurrent 401s, cross-tab lock inside the token
//     manager) and replays the original request ONCE with the same Idempotency-Key. Refresh failure rejects with
//     ApiError(AUTH_REQUIRED, reason); the token manager emits the session-ended event once, and TASK-023 turns that into
//     the `/login?returnTo=` redirect and clears the Query cache;
//   - 15 s timeout combined with the caller's signal (`anySignal`, not AbortSignal.any). A caller abort rejects with an
//     AbortError that TanStack Query ignores; nothing is logged;
//   - never retries a failed call by itself: a network error or timeout on a POST may have been processed, so only the
//     caller (with the same Idempotency-Key) may retry. The 401 replay is safe because the server rejected the credential
//     before running the handler;
//   - cookies: `credentials: 'same-origin'` so cookie-mode token endpoints can set the httpOnly refresh cookie (login,
//     register, OAuth exchange). The cookie is Path=/api/auth; every other call authenticates with the bearer header;
//   - nothing is logged: no URL, header, token or body.

export const BROWSER_REQUEST_TIMEOUT_MS = 15_000

export interface BrowserClientDeps {
  tokens: Pick<TokenManager, 'getAccessToken' | 'refresh'> & Partial<Pick<TokenManager, 'mode'>>
  /** Test seam. */
  fetchImpl?: FetchLike
  /** Test seam. Default: `window.location.origin` (throws on the server). */
  origin?: () => string
  /** Default: NEXT_PUBLIC_API_BASE_URL. */
  basePath?: string
  timeoutMs?: number
}

export interface BrowserClient extends ApiRequester {
  readonly tokens: TokenManager
}

function windowOrigin(): string {
  if (typeof window === 'undefined') throw new Error('The browser API client cannot run on the server.')
  return window.location.origin
}

const SAFE_EXTRA_HEADER = /^[A-Za-z][A-Za-z0-9-]{0,63}$/

function isRefreshableUnauthorised(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 401 && (error.code === 'AUTH_REQUIRED' || error.code === 'HTTP_401')
  )
}

/** TokenError (refresh failed) to ApiError. The code and the closed reason survive; nothing else does. */
function fromTokenError(error: unknown): ApiError {
  if (error instanceof TokenError) return new ApiError(error.code, { status: error.status, reason: error.reason })
  return new ApiError('NETWORK', { status: 0 })
}

/** Rejects with an AbortError as soon as the caller aborts, without cancelling the shared work behind `promise`. */
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return promise
  if (signal.aborted) return Promise.reject(createAbortError())
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(createAbortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error('Request failed'))
      },
    )
  })
}

export function createRequester(deps: BrowserClientDeps): ApiRequester {
  const { tokens } = deps
  const getOrigin = deps.origin ?? windowOrigin
  const basePath = deps.basePath ?? envPublic.API_BASE_URL
  const timeoutMs = deps.timeoutMs ?? BROWSER_REQUEST_TIMEOUT_MS

  async function refreshToken(signal: AbortSignal | undefined): Promise<string> {
    try {
      return await raceAbort(tokens.refresh(), signal)
    } catch (error) {
      if (isAbortError(error)) throw error
      throw fromTokenError(error)
    }
  }

  async function execute(spec: RequestSpec, schema: z.ZodType | undefined): Promise<unknown> {
    const origin = getOrigin()
    const url = resolveApiUrl({ origin, basePath, path: spec.path, query: spec.query })
    const extra: Record<string, string> = {}
    for (const [name, value] of Object.entries(spec.headers ?? {})) {
      if (!SAFE_EXTRA_HEADER.test(name) || name.toLowerCase() === 'authorization') throw new Error('Invalid API header')
      extra[name] = value
    }

    const attempt = async (token: string | null): Promise<unknown> => {
      const headers: Record<string, string> = { Accept: 'application/json', ...extra }
      if (spec.body !== undefined) headers['Content-Type'] = 'application/json'
      if (spec.idempotencyKey !== undefined) headers['Idempotency-Key'] = spec.idempotencyKey
      // Cookie mode: every unsafe call carries the custom CSRF header (a cross-site form cannot set it). The value is
      // the access token when there is one, else the bootstrap marker (same rule as refresh/logout in tokens.ts).
      if (tokens.mode === 'cookie' && spec.method !== 'GET' && !('X-CSRF-Token' in headers)) {
        headers['X-CSRF-Token'] = token ?? CSRF_BOOTSTRAP_VALUE
      }
      if (spec.stepUpToken !== undefined) {
        if (!isSameOrigin(url, origin)) throw new ApiError('NETWORK', { status: 0 })
        headers['X-Step-Up-Token'] = spec.stepUpToken
      }
      // F-16: attach the credential only to the page origin (resolveApiUrl already pins it; this is the explicit check).
      if (token !== null) {
        if (!isSameOrigin(url, origin)) throw new ApiError('NETWORK', { status: 0 })
        headers.Authorization = `Bearer ${token}`
      }
      const result = await sendRequest({
        url: url.toString(),
        init: {
          method: spec.method,
          headers,
          ...(spec.body === undefined ? {} : { body: JSON.stringify(spec.body) }),
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error', // a redirect could carry the bearer to another host; the API never redirects JSON calls
        },
        signal: spec.signal,
        timeoutMs,
        schema,
        legacyPage: spec.legacyPage,
        fetchImpl: deps.fetchImpl,
      })
      return result.data
    }

    if (spec.bearer !== undefined) return attempt(spec.bearer) // explicit token (step-up): no refresh path
    if (spec.auth !== true) return attempt(null)

    // Authenticated call. No usable access token (reload, expiry, admin cap) means refresh before the first send.
    const first = tokens.getAccessToken() ?? (await refreshToken(spec.signal))
    try {
      return await attempt(first)
    } catch (error) {
      if (!isRefreshableUnauthorised(error)) throw error
      const fresh = await refreshToken(spec.signal)
      return attempt(fresh) // exactly one replay; a second 401 propagates
    }
  }

  return {
    json: async <S extends z.ZodType>(spec: RequestSpec, schema: S): Promise<z.output<S>> =>
      (await execute(spec, schema)) as z.output<S>,
    empty: async (spec: RequestSpec): Promise<void> => {
      await execute(spec, undefined)
    },
  }
}

export function createBrowserClient(deps: BrowserClientDeps & { tokens: TokenManager }): BrowserClient {
  return { ...createRequester(deps), tokens: deps.tokens }
}

// ---- app singleton ----
// Created lazily on first use in the browser. Nothing is created at import time, so a server render that merely imports
// this module (a client component is also rendered once on the server) never creates shared mutable state.

let instance: BrowserClient | null = null
let stepUpInstance: StepUp | null = null
let appTransport: AuthTransport | null = null

/**
 * The TokenManager's transport. Mock builds (TASK-021) answer refresh, logout and step-up from the mock auth backend; the
 * TokenManager needs a transport synchronously, so a forwarding transport loads the mock on its first call.
 * The condition is the inline `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'` literal, NOT `USE_MOCKS` imported from
 * adapters/mock-switch.ts: Turbopack folds the inlined env literal at this call site but does not fold an imported
 * constant, so only this form makes the branch and its `import()` dead code with mocks off (verified on the build output,
 * TASK-023). Next inlines the variable only when it is set: production builds must set NEXT_PUBLIC_USE_MOCKS=false.
 */
function createAppAuthTransport(): AuthTransport {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    let mock: Promise<AuthTransport> | null = null
    return async (request) => {
      mock ??= import('@/lib/api/browser/mock-auth-transport').then((module) => module.createMockTokenTransport())
      return (await mock)(request)
    }
  }
  return createFetchAuthTransport()
}

/** The app's browser client. Calls `configureTokens(<app auth transport>)` exactly once. Throws on the server. */
export function getBrowserClient(): BrowserClient {
  if (typeof window === 'undefined') throw new Error('The browser API client cannot run on the server.')
  if (instance === null) {
    appTransport = createAppAuthTransport()
    const tokens = configureTokens(appTransport)
    instance = createBrowserClient({ tokens })
  }
  return instance
}

/**
 * The app's step-up helper (single-use X-Step-Up-Token grant from POST /auth/step-up, in memory only, dropped when
 * the session ends). Admin adapters call `getStepUp().withStepUp((grant) => call({ stepUpToken: grant?.token }), prompt)`.
 */
export function getStepUp(): StepUp {
  const { tokens } = getBrowserClient()
  stepUpInstance ??= createStepUp({
    transport: appTransport as AuthTransport, // set by getBrowserClient() above
    getAccessToken: tokens.getAccessToken,
    subscribeSessionEnd: (listener) =>
      tokens.subscribe(() => {
        listener()
      }),
  })
  return stepUpInstance
}
