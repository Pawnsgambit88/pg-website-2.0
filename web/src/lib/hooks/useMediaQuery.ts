'use client'

import { useCallback, useSyncExternalStore } from 'react'

// One MediaQueryList and one `change` listener per distinct query, shared by every hook instance (RBP client-event-listeners).
// The registry is touched only from `subscribe`, which React never calls on the server.
interface Entry {
  list: MediaQueryList
  listeners: Set<() => void>
  onChange: () => void
}
const registry = new Map<string, Entry>()

function supported(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function subscribeTo(query: string, listener: () => void): () => void {
  if (!supported()) return () => undefined
  let entry = registry.get(query)
  if (entry === undefined) {
    const list = window.matchMedia(query)
    const listeners = new Set<() => void>()
    const onChange = () => {
      for (const subscriber of listeners) subscriber()
    }
    list.addEventListener('change', onChange)
    entry = { list, listeners, onChange }
    registry.set(query, entry)
  }
  entry.listeners.add(listener)
  const current = entry
  return () => {
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      current.list.removeEventListener('change', current.onChange)
      registry.delete(query)
    }
  }
}

/**
 * Whether a CSS media query currently matches, for behaviour that CSS alone cannot express. Layout and visibility
 * belong in CSS (Tailwind breakpoints); use this only when JavaScript must branch.
 *
 * SSR-safe: the server render and the first client render both use `serverValue` (default `false`), then React
 * re-renders with the real answer after hydration, so there is no hydration mismatch. The first paint therefore shows
 * the `serverValue` branch: pick the value that is harmless if wrong. One shared listener per query; cleans up on unmount.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback((listener: () => void) => subscribeTo(query, listener), [query])
  const getSnapshot = useCallback(
    () => (supported() ? window.matchMedia(query).matches : serverValue),
    [query, serverValue],
  )
  const getServerSnapshot = useCallback(() => serverValue, [serverValue])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
