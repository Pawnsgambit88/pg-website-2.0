import { userRoleSchema, type UserRole } from '@/lib/api/types/auth'
import { defineStore } from '@/lib/storage/versioned'

// Non-secret session hint (ARCH-001 12.2, SEC-001 F-04). `pg:session-hint:v1 = { role }` is written at sign-in so the
// public nav island can swap "Log in" for "My PG" or "Admin" after hydration WITHOUT importing the token store.
// This module deliberately imports nothing from lib/api/browser: (public) code may use it, and it must never be given
// a token. The hint is advisory UX only; the server decides every authorisation (12.5).

export interface SessionHint {
  role: UserRole
}

function parseHint(value: unknown): SessionHint | null {
  if (typeof value !== 'object' || value === null) return null
  const role = userRoleSchema.safeParse((value as Record<string, unknown>).role)
  return role.success ? { role: role.data } : null
}

const store = defineStore<SessionHint>({ area: 'local', name: 'session-hint', version: 1, parse: parseHint })

/** The stored role hint, or `null` when absent, invalid or storage is unavailable. */
export function readSessionHint(): SessionHint | null {
  return store.read()
}

/** Persists the role only. Returns `false` when storage is unavailable (the nav then keeps showing "Log in"). */
export function writeSessionHint(role: UserRole): boolean {
  return store.write({ role })
}

export function clearSessionHint(): boolean {
  return store.remove()
}

/** Cross-tab only (the `storage` event never fires in the writing tab). Removal arrives as `null`. */
export function subscribeSessionHint(listener: (hint: SessionHint | null) => void): () => void {
  return store.subscribe((value) => {
    listener(value)
  })
}
