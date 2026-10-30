'use client'

import { useSyncExternalStore } from 'react'

// One shared pair of window listeners for every hook instance (RBP client-event-listeners).
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('online', notify)
    window.addEventListener('offline', notify)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('online', notify)
      window.removeEventListener('offline', notify)
    }
  }
}

const getSnapshot = (): boolean => navigator.onLine
// The server cannot know; assume online so the offline banner never appears in server HTML.
const getServerSnapshot = (): boolean => true

/**
 * Browser connectivity (`navigator.onLine`). It only detects "no network interface": `true` does not prove the API is
 * reachable, so request failures are still handled by the data layer. Used for the offline banner (ARCH-001 11.9).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
