'use client'

import type { MeDto } from '@/lib/api/types/auth'

// Auth state store (TASK-023; ARCH-001 12.2, 12.6). A tiny external store, one per mounted AuthProvider, read through
// `useSyncExternalStore` with selectors (hooks in useAuth.ts). A component that selects a derived primitive (`isAdmin`,
// `status`) re-renders only when that primitive changes, not on every profile change (RBP rerender-derived-state,
// rerender-defer-reads). Never holds a token: tokens live in lib/api/browser/tokens.ts only.

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export interface AuthState {
  readonly status: AuthStatus
  /** The server's view of the user (`GET /auth/me`). `null` unless signed in. */
  readonly user: MeDto | null
  /**
   * Set only when the bootstrap or `refreshUser()` failed for a reason other than "no valid session" (offline, 5xx).
   * The session may still be valid, so guards should offer a retry (`refreshUser`) instead of sending the user to login.
   */
  readonly error: unknown
}

/** Server render and first client render: no flash of signed-out UI (guards show a skeleton while `loading`). */
export const INITIAL_AUTH_STATE: AuthState = Object.freeze({ status: 'loading', user: null, error: null })

export const SIGNED_OUT_STATE: AuthState = Object.freeze({ status: 'signed-out', user: null, error: null })

export interface AuthStore {
  getSnapshot: () => AuthState
  subscribe: (listener: () => void) => () => void
  set: (next: AuthState) => void
}

export function createAuthStore(initial: AuthState = INITIAL_AUTH_STATE): AuthStore {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set: (next) => {
      if (Object.is(next, state)) return
      state = next
      for (const listener of [...listeners]) listener()
    },
  }
}
