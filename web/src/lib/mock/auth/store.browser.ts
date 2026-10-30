'use client'

import { initialAuthState, parseAuthState, type AuthState, type AuthStateStore } from '@/lib/mock/auth/state'
import { defineStore } from '@/lib/storage/versioned'

// Session storage for the mock auth "server database" (TASK-021; ARCH-001 11.4): sessionStorage key `pg:mock:v1:auth`
// (the mock namespace of lib/mock/store.browser.ts, suffix `auth`), through lib/storage/versioned.ts. Nothing is cached
// in memory: every read parses storage (or rebuilds the frozen seeds), every write replaces it. When storage is
// unavailable (private mode, quota) writes fail silently and each call starts from the seeds: login still answers, but
// the issued tokens are unknown to the next call (AUTH_REQUIRED), so the mock cannot keep a session in that browser.

const SUFFIX = 'auth'

const store = defineStore<AuthState>({ area: 'session', name: 'mock', version: 1, parse: parseAuthState })

export function createSessionAuthStore(): AuthStateStore {
  return {
    read: () => store.read(SUFFIX) ?? initialAuthState(),
    write: (state) => {
      store.write(state, SUFFIX)
    },
  }
}

/** Forgets every mock account, session family and reset request of this browser session. */
export function clearMockAuthSession(): void {
  store.remove(SUFFIX)
}
