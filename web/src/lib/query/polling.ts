'use client'

import {
  useQuery,
  type DefaultError,
  type Query,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

// usePolling: a query that refreshes itself while the user can see it (ARCH-001 11.9; FEAT-001 AC-45).
//
// Design
//   - Built on TanStack's `refetchInterval`, so it shares the cache entry (and the in-flight request) with every other
//     component using the same `queryOptions`; polling never adds a second request for the same key.
//   - Idle default 30 s (AC-45 ceiling). Callers pass a faster `intervalMs` for live states, either a number or a function
//     of the latest data (Event Room: 5 s in pairing_pending / between_rounds, 15 s live, 30 s otherwise).
//   - PAUSED (no timer at all) when the tab is hidden or the browser is offline. Both are React state, so a change
//     re-renders, TanStack re-reads the interval and the timer is cleared or restarted. `refetchOnWindowFocus` and
//     `refetchOnReconnect` (client defaults) then refresh stale data immediately on return; snapshots use staleTime 0.
//   - BACKOFF on consecutive failures: delay = interval * 2^failures, capped at MAX_BACKOFF_MS (60 s) but never below the
//     interval. The first success resets it (`errorUpdateCount` is zeroed by TanStack on success). A failing endpoint is
//     therefore asked less and less often, but an outage is noticed within a minute once it heals.
//   - JITTER of +/-10 % on every delay so many tabs (and an event's whole field of players) do not hit the API in lockstep.
//   - MANUAL REFRESH: `refresh()` is a plain `refetch()`; it works while paused and is what a "Refresh" button calls.
//   - A 4xx failure stops polling (the answer will not change by asking again, e.g. REGISTRATION_NOT_CONFIRMED); `refresh()`
//     still works.
//   - Errors keep the last good data in the result (`data` is retained), so the UI can show it with a "last updated" label.

export const DEFAULT_POLL_INTERVAL_MS = 30_000
export const MAX_BACKOFF_MS = 60_000
const JITTER_RATIO = 0.1

type IntervalSpec<TRaw> = number | ((data: TRaw | undefined) => number)

export interface PollingOptions<TRaw> {
  /** Interval while healthy and visible. Default 30 s (AC-45). Minimum 1 s. */
  intervalMs?: IntervalSpec<TRaw>
  /** `false` turns polling off (the query still fetches normally). Default true. */
  enabled?: boolean
}

export type PollingResult<TData, TError> = UseQueryResult<TData, TError> & {
  /** Manual refresh; works while polling is paused. */
  refresh: () => Promise<UseQueryResult<TData, TError>>
  /** True while the timer is suspended because the tab is hidden or the browser is offline. */
  isPollingPaused: boolean
}

// One shared visibilitychange listener for every hook instance (RBP client-event-listeners).
const visibilityListeners = new Set<() => void>()
function notifyVisibility(): void {
  for (const listener of visibilityListeners) listener()
}
function subscribeVisibility(listener: () => void): () => void {
  if (visibilityListeners.size === 0) document.addEventListener('visibilitychange', notifyVisibility)
  visibilityListeners.add(listener)
  return () => {
    visibilityListeners.delete(listener)
    if (visibilityListeners.size === 0) document.removeEventListener('visibilitychange', notifyVisibility)
  }
}
const getVisible = (): boolean => document.visibilityState !== 'hidden'
const getServerVisible = (): boolean => true

/** Pure delay calculation, exported for the unit tests that come later. `random` is injectable (0..1). */
export function nextPollDelay(baseMs: number, failures: number, random: () => number = Math.random): number {
  const base = Math.max(1_000, baseMs)
  const backedOff = failures > 0 ? Math.min(base * 2 ** Math.min(failures, 10), Math.max(MAX_BACKOFF_MS, base)) : base
  const jitter = 1 + (random() * 2 - 1) * JITTER_RATIO
  return Math.round(backedOff * jitter)
}

function isClientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

export function usePolling<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  polling: PollingOptions<TQueryFnData> = {},
): PollingResult<TData, TError> {
  const { intervalMs = DEFAULT_POLL_INTERVAL_MS, enabled: pollEnabled = true } = polling
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, getServerVisible)
  const online = useOnlineStatus()
  const paused = !visible || !online

  const refetchInterval = (query: Query<TQueryFnData, TError, TQueryFnData, TQueryKey>): number | false => {
    if (!pollEnabled || paused) return false
    if (query.state.status === 'error' && isClientError(query.state.error)) return false
    const latest = query.state.data
    const base = typeof intervalMs === 'function' ? intervalMs(latest) : intervalMs
    const failures = query.state.status === 'error' ? Math.max(1, query.state.errorUpdateCount) : 0
    return nextPollDelay(base, failures)
  }

  const result = useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
    refetchInterval,
    refetchIntervalInBackground: false,
  })

  const { refetch } = result
  const refresh = useCallback(() => refetch(), [refetch])

  return Object.assign(result, { refresh, isPollingPaused: pollEnabled && paused })
}
