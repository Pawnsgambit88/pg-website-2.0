'use client'

// One-shot marker for "the user pressed Sign out in this tab" (ARCH-001 12.4). The sign-out button sets it just before
// calling logout() and navigates itself; RequireAuth consumes it so it does not race that navigation with its own
// /login?returnTo= redirect. A session that ends for any other reason (expiry, reuse, another tab) leaves it unset, so
// the normal "return to this page after signing in again" behaviour is unchanged.
//
// Kept in sessionStorage (through the versioned store, the only allowed storage entry point) rather than a module
// variable: no module-level mutable state, and it survives the client navigation between the two components.

import { defineStore } from '@/lib/storage/versioned'

const marker = defineStore<true>({
  area: 'session',
  name: 'signed-out',
  version: 1,
  parse: (value) => (value === true ? true : null),
})

/** Marks an explicit sign-out. Call immediately before `logout()`. */
export function markExplicitSignOut(): void {
  marker.write(true)
}

/** True once, if a sign-out was just requested in this tab; clears the marker. */
export function consumeExplicitSignOut(): boolean {
  const set = marker.read() === true
  if (set) marker.remove()
  return set
}
