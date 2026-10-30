import { QueryClient } from '@tanstack/react-query'
import { isAbortError, isApiError } from '@/lib/api/errors'

// QueryClient factory (ARCH-001 11.9). A FUNCTION, never a module-scope instance: the provider calls it once per browser
// session inside a useState initialiser (RBP server-no-shared-module-state).
//
// Defaults
//   staleTime  30 s for lists and details; snapshots (Event Room, availability-like reads) set `staleTime: 0` in their own
//              queryOptions. See STALE_TIME below for the named values the queryOptions helpers use.
//   gcTime     5 min.
//   retry      queries only: never for a 4xx ApiError (the answer will not change), never for BAD_RESPONSE or an abort;
//              at most 2 retries for network, timeout and 5xx. Mutations NEVER retry (a POST may have been processed;
//              a retry is the user's explicit act and reuses the same Idempotency-Key).
//   focus      refetch on window focus only when the data is already stale (staleTime gates it), so a tab switch does
//              not hammer the API. Reconnect refetch is on (networkMode 'online' pauses queries while offline).
//   mutations  networkMode 'always': they fail fast with NETWORK instead of being paused and replayed later. The UI
//              disables mutations while offline; nothing is queued (ARCH-001 11.9).

export const STALE_TIME = {
  /** Snapshots and anything polled: always refetch on mount. */
  snapshot: 0,
  /** Account, profile, lists, details. */
  default: 30_000,
  /** Bounded reference data (event types, settings, CMS section list). */
  reference: 5 * 60_000,
} as const

export const GC_TIME_MS = 5 * 60_000
export const MAX_QUERY_RETRIES = 2
const RETRY_BASE_MS = 1_000
const RETRY_CAP_MS = 10_000

/** Retry only transient failures, at most MAX_QUERY_RETRIES times. Exported for the polling hook and tests. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false
  if (isAbortError(error)) return false
  if (isApiError(error)) {
    if (error.status >= 400 && error.status < 500) return false
    if (error.code === 'BAD_RESPONSE') return false
    return true // status 0 (network, timeout) or 5xx
  }
  return false // a programming error will not fix itself
}

/** Exponential 1 s, 2 s ... capped at 10 s; a server `Retry-After` (seconds) wins when longer, still capped. */
export function queryRetryDelay(attemptIndex: number, error: unknown): number {
  const backoff = Math.min(RETRY_BASE_MS * 2 ** attemptIndex, RETRY_CAP_MS)
  const hinted = isApiError(error) && error.retryAfter !== undefined ? error.retryAfter * 1000 : 0
  return Math.min(Math.max(backoff, hinted), RETRY_CAP_MS)
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.default,
        gcTime: GC_TIME_MS,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
        retry: false,
        networkMode: 'always',
      },
    },
  })
}
