'use client'

import { useSyncExternalStore } from 'react'

// The URL hash as an external store (TASK-042). Play keeps its filter state in the hash, not in searchParams, so the
// page stays static (ARCH-001 7.3). One shared pair of window listeners for every subscriber (RBP client-event-listeners).
// `popstate` covers Back/Forward over entries we pushed; `hashchange` covers a typed or linked hash. Our own
// pushState/replaceState fire neither, so writers call `notifyHashChange()`.
//
// Module state is only the listener set, written in the browser by `subscribe`, never during server render.

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('popstate', notify)
    window.addEventListener('hashchange', notify)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('popstate', notify)
      window.removeEventListener('hashchange', notify)
    }
  }
}

const getSnapshot = (): string => window.location.hash
// The prerendered HTML has no hash: the server (and the hydration pass) render the unfiltered list.
const getServerSnapshot = (): string => ''

/** Current `location.hash` (with `#`, or `''`). Re-renders on Back/Forward and on writes through `writeHash`. */
export function useLocationHash(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Writes `hash` (with `#`, or `''` to drop it) to the address bar. `push` adds a history entry so Back restores the
 * previous filter; `replace` rewrites the current one (search typing). Next's patched history methods keep the router
 * state on the entry, so Back stays a client-side traversal. No-op when the hash is already `hash`.
 */
export function writeHash(hash: string, mode: 'push' | 'replace'): void {
  if (window.location.hash === hash) return
  const url = `${window.location.pathname}${window.location.search}${hash}`
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
  notify()
}
