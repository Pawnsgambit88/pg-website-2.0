'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { fetchAvailability } from '@/components/public/events/fetchAvailability'
import { isAbortError } from '@/lib/api/errors'
import type { AvailabilityDto } from '@/lib/api/types/event-state'
import { parseSlug } from '@/lib/api/types/primitives'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { reportError } from '@/lib/observe/observer'

// Live availability for one event on a (public) page (TASK-123; ARCH-001 9.6, 11.6). No TanStack Query: Query stays out
// of the public bundle (AC-98, depcruise m3-public-no-query). Not useApi() either: that reaches the token code banned
// from (public) (m3-public-no-token-or-auth-code); fetchAvailability is a credential-free public transport.
// One poll per caller, no cross-instance cache.
//
// Lifecycle:
//   - first request on mount (next macrotask), then every 30 s after each settled request (never overlapping: one
//     request in flight at a time);
//   - hidden tab: no request starts while `document.hidden`; on return the overdue poll runs at once;
//   - offline (`navigator.onLine` false): the loop stops and the in-flight request is aborted; reconnecting restarts it
//     with an immediate request;
//   - errors: the last-known value stays, status becomes `error`, the next attempt backs off exponentially
//     (60 s, 120 s, ... capped at 5 min) and resets after a success or a manual `refresh()`;
//   - unmount aborts the in-flight request; an abort is never surfaced as an error.

export const AVAILABILITY_POLL_MS = 30_000
export const AVAILABILITY_MAX_BACKOFF_MS = 300_000

/** idle: nothing requested yet (or invalid slug); loading: first request pending; success / error: last outcome. */
export type AvailabilityStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseAvailabilityResult {
  /** Last-known live value; kept through later errors. `undefined` until the first success. */
  data: AvailabilityDto | undefined
  status: AvailabilityStatus
  /** The last failure (an `ApiError` in practice); cleared by the next success. Map it with `copyFor`, never render it. */
  error: unknown
  /** Fetch now and reset the backoff. Stable identity. */
  refresh: () => void
}

export interface UseAvailabilityOptions {
  /** Default true. False stops polling (for example when the event is completed). */
  enabled?: boolean
  /** Poll interval in ms. Default 30 s. */
  intervalMs?: number
}

interface AvailabilityState {
  data: AvailabilityDto | undefined
  status: AvailabilityStatus
  error: unknown
}

const INITIAL_STATE: AvailabilityState = { data: undefined, status: 'idle', error: undefined }

/** Delay before the next attempt after `failures` consecutive failures (0 means the normal interval). */
export function availabilityDelay(failures: number, intervalMs: number): number {
  if (failures <= 0) return intervalMs
  return Math.min(intervalMs * 2 ** failures, AVAILABILITY_MAX_BACKOFF_MS)
}

export function useAvailability(slug: string, options: UseAvailabilityOptions = {}): UseAvailabilityResult {
  const { enabled = true, intervalMs = AVAILABILITY_POLL_MS } = options
  const online = useOnlineStatus()
  const [state, setState] = useState<AvailabilityState>(INITIAL_STATE)
  // Bumping the generation restarts the loop: an immediate request with the backoff reset.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const parsed = parseSlug(slug)
    if (parsed === null || !enabled || !online) return
    const validSlug = parsed

    let disposed = false
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let dueAt = 0
    let controller: AbortController | null = null

    const schedule = (delayMs: number): void => {
      if (timer !== undefined) clearTimeout(timer)
      dueAt = Date.now() + delayMs
      timer = setTimeout(tick, delayMs)
    }

    function tick(): void {
      timer = undefined
      // Hidden: leave `dueAt` as is; the visibility listener resumes the loop.
      if (disposed || document.hidden || controller !== null) return
      const current = new AbortController()
      controller = current
      // Only the first request shows `loading`; background polls keep the current value and status.
      setState((previous) =>
        previous.data === undefined && previous.status !== 'loading' ? { ...previous, status: 'loading' } : previous,
      )
      fetchAvailability(validSlug, current.signal).then(
        (data) => {
          if (disposed) return
          controller = null
          failures = 0
          startTransition(() => {
            setState({ data, status: 'success', error: undefined })
          })
          schedule(availabilityDelay(0, intervalMs))
        },
        (error: unknown) => {
          if (disposed || isAbortError(error)) return
          controller = null
          failures += 1
          reportError(error, { area: 'public', action: 'availability-poll' })
          startTransition(() => {
            setState((previous) => ({ data: previous.data, status: 'error', error }))
          })
          schedule(availabilityDelay(failures, intervalMs))
        },
      )
    }

    const onVisibilityChange = (): void => {
      if (document.hidden || controller !== null) return
      schedule(Math.max(0, dueAt - Date.now()))
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    schedule(0)

    return () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [slug, enabled, online, intervalMs, generation])

  const refresh = useCallback(() => {
    setGeneration((value) => value + 1)
  }, [])

  return { data: state.data, status: state.status, error: state.error, refresh }
}
