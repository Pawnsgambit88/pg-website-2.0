import { ApiError } from '@/lib/api/errors'
import { authRequired } from '@/lib/mock/auth/errors'
import type { AuthState, AuthStateStore } from '@/lib/mock/auth/state'

// One mock "server request" against the session store (ARCH-001 11.4): read the state, run the handler synchronously,
// write the state back, also when the handler throws (a reuse detection revokes a family AND fails the call).
// Synchronous between read and write, so two calls in one tab cannot interleave. On the server there is no store:
// a read answers AUTH_REQUIRED (no session can exist there) and a write answers MOCK_SERVER_MUTATION.

export type TransactionKind = 'read' | 'write'

/** Throws the server-side answer when there is no browser session store. Call first, before validating input. */
export function assertBrowserStore(
  store: AuthStateStore | null,
  kind: TransactionKind,
): asserts store is AuthStateStore {
  if (store === null || typeof window === 'undefined') {
    throw kind === 'read' ? authRequired() : new ApiError('MOCK_SERVER_MUTATION', { status: 0 })
  }
}

export function transact<T>(store: AuthStateStore | null, kind: TransactionKind, handler: (state: AuthState) => T): T {
  assertBrowserStore(store, kind)
  const state = store.read()
  if (kind === 'read') return handler(state)
  try {
    return handler(state)
  } finally {
    store.write(state)
  }
}
