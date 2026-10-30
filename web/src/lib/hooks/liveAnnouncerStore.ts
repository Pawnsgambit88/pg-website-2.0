'use client'

// State behind the single polite live region (ARCH-001 15 "Live regions"). `LiveRegion` renders it; `useLiveAnnouncer`
// writes to it. Browser-only: every write is a no-op without `window`, so nothing is mutated during server render.

/** Wait between clearing and re-filling the region, so the same text twice in a row is announced twice. */
export const REANNOUNCE_DELAY_MS = 60
/** Time the text stays in the region. Stale text would be read again in screen-reader browse mode. */
export const CLEAR_AFTER_MS = 6000

const listeners = new Set<() => void>()
let message = ''
let fillTimer: ReturnType<typeof setTimeout> | undefined
let clearTimer: ReturnType<typeof setTimeout> | undefined

function emit(): void {
  for (const listener of listeners) listener()
}

function setMessage(next: string): void {
  if (message === next) return
  message = next
  emit()
}

/** Announces `text` politely, once. Empty or whitespace-only text is ignored. A newer call replaces a pending one. */
export function announce(text: string): void {
  if (typeof window === 'undefined') return
  const trimmed = text.trim()
  if (trimmed === '') return
  clearTimeout(fillTimer)
  clearTimeout(clearTimer)
  setMessage('')
  fillTimer = setTimeout(() => {
    setMessage(trimmed)
    clearTimer = setTimeout(() => setMessage(''), CLEAR_AFTER_MS)
  }, REANNOUNCE_DELAY_MS)
}

/** Empties the region immediately and cancels pending announcements (route change, tests). */
export function clearAnnouncement(): void {
  clearTimeout(fillTimer)
  clearTimeout(clearTimer)
  setMessage('')
}

export function subscribeToAnnouncements(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAnnouncementSnapshot(): string {
  return message
}

export function getAnnouncementServerSnapshot(): string {
  return ''
}
