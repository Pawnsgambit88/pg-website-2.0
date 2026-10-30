import 'server-only'
import { DUPLICATE_WINDOW_MS, MAX_REMEMBERED_EVENTS } from './limits.ts'

/**
 * Bounded, per-instance memory of event ids (best effort; expiry is idempotent, so a miss is harmless). The store is
 * created by the route module, which is the one place allowed to hold module state (rules: documented exception); this
 * file only provides the factory so it stays testable.
 */
export interface DuplicateStore {
  /** True if `eventId` was recorded within the window. */
  has(eventId: string, now: number): boolean
  /** Records the id (call only after signature, window and schema passed). */
  add(eventId: string, now: number): void
}

export function createDuplicateStore(
  windowMs: number = DUPLICATE_WINDOW_MS,
  capacity: number = MAX_REMEMBERED_EVENTS,
): DuplicateStore {
  const seen = new Map<string, number>() // insertion order = oldest first
  return {
    has(eventId, now) {
      const at = seen.get(eventId)
      if (at === undefined) return false
      if (now - at > windowMs) {
        seen.delete(eventId)
        return false
      }
      return true
    },
    add(eventId, now) {
      seen.delete(eventId)
      seen.set(eventId, now)
      while (seen.size > capacity) {
        const oldest = seen.keys().next().value
        if (oldest === undefined) break
        seen.delete(oldest)
      }
    },
  }
}
