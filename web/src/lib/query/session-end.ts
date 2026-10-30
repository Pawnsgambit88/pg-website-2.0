import type { QueryClient } from '@tanstack/react-query'

// Session end clears the cache (ARCH-001 11.9, 12.3 steps 4 and 5). The token manager emits one event per ended session
// (logout, SESSION_EXPIRED, REFRESH_REUSED, ROLE_CHANGED, ACCOUNT_SUSPENDED, remote tab sign-out). Whatever the reason, the
// previous user's data must not survive. `QueryClient.clear()` removes every query (destroying it cancels its in-flight
// fetch silently, so a late response cannot repopulate the cache) and every mutation. It is synchronous on purpose: no
// window in which the next render can still read the old user's data. Redirecting to /login is TASK-023's job.

export interface SessionEndedSource {
  subscribe: (listener: (event: { reason: string }) => void) => () => void
}

/** Wires `queryClient.clear()` to a session-ended source. Returns the unsubscribe function. */
export function clearCacheOnSessionEnd(queryClient: QueryClient, source: SessionEndedSource): () => void {
  return source.subscribe(() => {
    queryClient.clear()
  })
}
