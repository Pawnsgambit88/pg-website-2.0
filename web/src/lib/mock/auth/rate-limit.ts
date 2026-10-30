import { rateLimited } from '@/lib/mock/auth/errors'
import { fingerprint } from '@/lib/mock/auth/random'
import type { AuthState } from '@/lib/mock/auth/state'

// Sliding-window rate limits for the mock auth backend (backend contract 2.10). Keyed by scope and a fingerprint of the
// subject (an email), never the subject itself. Applied identically to known and unknown emails so the limit itself
// cannot reveal whether an account exists.

export interface Limit {
  max: number
  windowMs: number
}

function keyOf(scope: string, subject: string): string {
  return `${scope}:${fingerprint(subject.trim().toLowerCase())}`
}

function recent(state: AuthState, key: string, limit: Limit, now: number): number[] {
  return (state.hits[key] ?? []).filter((at) => now - at < limit.windowMs)
}

/** Throws RATE_LIMITED (429, retry_after) when the window is already full. Does not count a hit. */
export function assertWithinLimit(state: AuthState, scope: string, subject: string, limit: Limit, now: number): void {
  const hits = recent(state, keyOf(scope, subject), limit, now)
  if (hits.length < limit.max) return
  const oldest = Math.min(...hits)
  throw rateLimited(Math.max(1, Math.ceil((oldest + limit.windowMs - now) / 1000)))
}

export function recordHit(state: AuthState, scope: string, subject: string, limit: Limit, now: number): void {
  const key = keyOf(scope, subject)
  state.hits[key] = [...recent(state, key, limit, now), now].slice(-limit.max)
}

export function clearHits(state: AuthState, scope: string, subject: string): void {
  delete state.hits[keyOf(scope, subject)]
}

/** Drops every hit older than `maxWindowMs`, and empty keys. */
export function pruneHits(state: AuthState, maxWindowMs: number, now: number): void {
  for (const [key, hits] of Object.entries(state.hits)) {
    const kept = hits.filter((at) => now - at < maxWindowMs)
    if (kept.length === 0) delete state.hits[key]
    else state.hits[key] = kept
  }
}
