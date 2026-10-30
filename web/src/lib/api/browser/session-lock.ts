'use client'

import { defineStore } from '@/lib/storage/versioned'

// Cross-tab mutual exclusion for the refresh call (ARCH-001 12.3 step 3). Refresh tokens rotate and are single use, so
// two tabs refreshing at once would invalidate each other. Primary: Web Locks (`navigator.locks`, Safari 15.4+, inside
// the browser floor). Fallback where it is absent: a `localStorage` lease `pg:auth:lock:v1` with a 10 s expiry.
// The lease is best effort (storage is not atomic): it narrows the race window, it does not remove it. The server grace
// window (contract 2.4, 10 s replay tolerance) covers the rest. If storage is unavailable too, the lock is a no-op.

export const REFRESH_LOCK_NAME = 'pg-refresh'
export const LEASE_TTL_MS = 10_000
const LEASE_POLL_MS = 50

/** The slice of `LockManager` this module uses; tests inject a fake. */
export interface LockManagerLike {
  request: <T>(name: string, callback: () => Promise<T>) => Promise<T>
}

export interface SessionLockOptions {
  /** `null` forces the lease fallback. Default: `navigator.locks` when present. */
  locks?: LockManagerLike | null
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  /** Unique per tab/manager; default is random. */
  ownerId?: string
  leaseTtlMs?: number
  pollMs?: number
}

export type WithRefreshLock = <T>(fn: () => Promise<T>) => Promise<T>

interface Lease {
  owner: string
  expires: number
}

function parseLease(value: unknown): Lease | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return typeof record.owner === 'string' && typeof record.expires === 'number'
    ? { owner: record.owner, expires: record.expires }
    : null
}

const leaseStore = defineStore<Lease>({ area: 'local', name: 'auth:lock', version: 1, parse: parseLease })

function defaultLocks(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null
  const locks = (navigator as { locks?: LockManagerLike }).locks
  return typeof locks?.request === 'function' ? locks : null
}

function randomId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Math.random()).slice(2)
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** Builds the lock wrapper. `fn` runs with the lock held and its result or rejection passes through unchanged. */
export function createRefreshLock(options: SessionLockOptions = {}): WithRefreshLock {
  const locks = options.locks === undefined ? defaultLocks() : options.locks
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const owner = options.ownerId ?? randomId()
  const ttl = options.leaseTtlMs ?? LEASE_TTL_MS
  const poll = options.pollMs ?? LEASE_POLL_MS

  if (locks !== null) {
    return <T>(fn: () => Promise<T>) => locks.request(REFRESH_LOCK_NAME, fn)
  }

  // Lease fallback. Waits for a foreign, unexpired lease for at most one TTL, then proceeds: a crashed tab must not
  // block sign-in forever, and a stale lease is by definition expired.
  async function acquire(): Promise<boolean> {
    const deadline = now() + ttl
    for (;;) {
      const current = leaseStore.read()
      if (current === null || current.expires <= now() || current.owner === owner) {
        if (!leaseStore.write({ owner, expires: now() + ttl })) return false // storage unavailable: no lock
        // Re-read to detect a tab that wrote between our read and write (last writer wins).
        if (leaseStore.read()?.owner === owner) return true
      }
      if (now() >= deadline) return false
      await sleep(poll)
    }
  }

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const held = await acquire()
    try {
      return await fn()
    } finally {
      if (held && leaseStore.read()?.owner === owner) leaseStore.remove()
    }
  }
}
