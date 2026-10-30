'use client'

import { safeRedirect } from '@/lib/security/safe-redirect'
import { defineStore } from '@/lib/storage/versioned'

// Return-to intent across a session end (TASK-023; ARCH-001 12.3 step 4, 12.4). When a session ends for any reason
// other than an explicit sign-out, the AuthProvider records the current same-origin path here, so the next sign-in can
// return there. sessionStorage `pg:intent:v1` (ARCH-001 22): this tab only, a path only, never a token or payload.
// Every read and write goes through `safeRedirect` (lib/security/safe-redirect), so an unsafe value can neither be stored nor come back out.
// The guards (TASK-024, guards.tsx) use these to carry the intent through `/login?returnTo=`.

interface StoredIntent {
  returnTo: string
}

function parseIntent(value: unknown): StoredIntent | null {
  if (typeof value !== 'object' || value === null) return null
  const returnTo = (value as Record<string, unknown>).returnTo
  const safe = typeof returnTo === 'string' ? safeRedirect(returnTo) : undefined
  return safe === undefined ? null : { returnTo: safe }
}

const intentStore = defineStore<StoredIntent>({ area: 'session', name: 'intent', version: 1, parse: parseIntent })

/** Records `path` (pathname plus search) as the return-to target. Unsafe paths and the auth screens are ignored. */
export function rememberReturnTo(path: string): void {
  const safe = safeRedirect(path)
  if (safe !== undefined) intentStore.write({ returnTo: safe })
}

/** The current page as a return-to path, or `undefined` on the server. */
export function currentPath(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}`
}

/** Reads and removes the recorded return-to path (single use). `undefined` when none or unsafe. */
export function takeReturnTo(): string | undefined {
  const stored = intentStore.read()
  intentStore.remove()
  return stored?.returnTo
}

/** Drops any recorded return-to path (explicit sign-out: the next user must not inherit it). */
export function clearReturnTo(): void {
  intentStore.remove()
}
