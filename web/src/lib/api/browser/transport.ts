'use client'

import { envPublic } from '@/lib/env/env.public'
import type { AuthRequest, AuthResponse, AuthTransport } from '@/lib/api/browser/auth-transport'
import { sendRequest, type FetchLike } from '@/lib/api/http'
import { ApiError, isAbortError } from '@/lib/api/errors'
import { isSameOrigin, resolveApiUrl } from '@/lib/api/url'

// The real fetch behind the token module's injected `AuthTransport` seam (TASK-125 -> TASK-014; ARCH-001 11.6, 12.1;
// SEC-001 F-10, F-16). It owns everything the token module deliberately does not: URL building from
// NEXT_PUBLIC_API_BASE_URL, the same-origin rule before an Authorization header, credentials mode, envelope unwrapping.
// It never logs and never puts a token, header or body in a thrown error.
//
// Contract with the token module ("Rejects only for transport failures"): offline, timeout and abort REJECT; every
// business failure (401, 403, 4xx, 5xx, a malformed body) RESOLVES with `{ ok: false, status, code, reason }`.

/** Auth calls are small and on the critical path of every refresh; a stuck one must not hold the shared refresh lock. */
export const AUTH_TRANSPORT_TIMEOUT_MS = 10_000

export interface AuthTransportOptions {
  /** Test seam. */
  fetchImpl?: FetchLike
  /** Test seam. Default: `location.origin`. */
  origin?: () => string
}

function currentOrigin(): string {
  if (typeof window === 'undefined') throw new Error('The auth transport can only run in the browser.')
  return window.location.origin
}

export function createFetchAuthTransport(options: AuthTransportOptions = {}): AuthTransport {
  const getOrigin = options.origin ?? currentOrigin

  return async function transport(request: AuthRequest): Promise<AuthResponse> {
    const origin = getOrigin()
    const url = resolveApiUrl({ origin, basePath: envPublic.API_BASE_URL, path: request.path })

    const headers: Record<string, string> = { Accept: 'application/json', ...request.headers }
    if (request.bearer !== undefined) {
      // F-16: the bearer goes out only when the resolved origin is the page origin. resolveApiUrl already pins the
      // origin; this is the explicit second check at the single place the header is attached.
      if (!isSameOrigin(url, origin)) throw new ApiError('NETWORK', { status: 0 })
      headers.Authorization = `Bearer ${request.bearer}`
    }
    if (request.body !== undefined) headers['Content-Type'] = 'application/json'

    try {
      const result = await sendRequest({
        url: url.toString(),
        init: {
          method: request.method,
          headers,
          ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
          credentials: request.withCredentials ? 'same-origin' : 'omit',
          cache: 'no-store',
          redirect: 'error',
        },
        timeoutMs: AUTH_TRANSPORT_TIMEOUT_MS,
        fetchImpl: options.fetchImpl,
      })
      return { ok: true, data: result.data }
    } catch (error) {
      if (isAbortError(error)) throw error
      if (error instanceof ApiError) {
        if (error.status === 0) throw error // NETWORK or TIMEOUT: transient, the token module keeps the session
        return { ok: false, status: error.status, code: error.code, reason: error.reason }
      }
      throw new ApiError('NETWORK', { status: 0 })
    }
  }
}
