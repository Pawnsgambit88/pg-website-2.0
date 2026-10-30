'use client'

import { use, useSyncExternalStore } from 'react'
import type { UserRole } from '@/lib/api/types/auth'
import { AuthActionsContext, AuthStoreContext } from '@/features/auth/auth-context'
import type { AuthActions } from '@/features/auth/auth-controller'
import { INITIAL_AUTH_STATE, type AuthState, type AuthStatus, type AuthStore } from '@/features/auth/auth-store'

// Auth hooks (TASK-023; ARCH-001 12.6). Prefer the narrowest hook: `useIsAdmin()` re-renders only when the boolean
// flips, `useAuthActions()` never re-renders (RBP rerender-derived-state, rerender-defer-reads). `useAuth()` is the
// convenience form and re-renders on every auth state change.

function useStore(): AuthStore {
  const store = use(AuthStoreContext)
  if (store === null) throw new Error('Auth hooks must be used inside <AuthProvider> (the client group layouts).')
  return store
}

/**
 * Subscribes to one derived value. The selector must return a primitive or a reference taken from the state (never a
 * new object), otherwise every store update re-renders. The server snapshot is always `loading`.
 */
export function useAuthSelector<T>(selector: (state: AuthState) => T): T {
  const store = useStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(INITIAL_AUTH_STATE),
  )
}

/** Stable for the life of the provider: safe in dependency arrays, and reading it subscribes to nothing. */
export function useAuthActions(): AuthActions {
  const actions = use(AuthActionsContext)
  if (actions === null) throw new Error('Auth hooks must be used inside <AuthProvider> (the client group layouts).')
  return actions
}

export function useAuthStatus(): AuthStatus {
  return useAuthSelector((state) => state.status)
}

export function useAuthUser(): AuthState['user'] {
  return useAuthSelector((state) => state.user)
}

export function useAuthRole(): UserRole | null {
  return useAuthSelector((state) => state.user?.role ?? null)
}

/** UX only: the server decides every authorisation (ARCH-001 12.5). */
export function useIsAdmin(): boolean {
  return useAuthSelector((state) => state.user?.role === 'admin')
}

export interface UseAuthResult extends AuthState, AuthActions {}

/** State plus actions. Re-renders on any auth state change; use the narrower hooks above in hot paths. */
export function useAuth(): UseAuthResult {
  const state = useAuthSelector((snapshot) => snapshot)
  const actions = useAuthActions()
  return { ...state, ...actions }
}
