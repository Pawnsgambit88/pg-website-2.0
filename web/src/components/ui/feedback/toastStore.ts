'use client'

// State behind the single `Toaster` (ARCH-001 15). Browser-only writes; the server snapshot is always empty. Spoken text
// goes through the shared polite live region (`announce`), so the toast list itself is not a second live region.

import { announce } from '@/lib/hooks/liveAnnouncerStore'

export type ToastTone = 'success' | 'error'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

/** Most toasts on screen at once. A newer one pushes the oldest out, so notifications never stack up. */
export const MAX_TOASTS = 3
/** Success toasts leave on their own after this long. Errors stay until dismissed (WCAG 2.2.1). */
export const SUCCESS_DISMISS_MS = 5000

const EMPTY: readonly ToastItem[] = []
const listeners = new Set<() => void>()
let items: readonly ToastItem[] = EMPTY
let nextId = 1

function emit(): void {
  for (const listener of listeners) listener()
}

/**
 * Shows a toast and announces its text once. An identical message already on screen is not added again (a retry loop
 * must not spam). Returns the toast id, or `undefined` when it was a duplicate or ran on the server.
 */
export function pushToast(tone: ToastTone, message: string): number | undefined {
  if (typeof window === 'undefined') return undefined
  const text = message.trim()
  if (text === '' || items.some((item) => item.tone === tone && item.message === text)) return undefined
  const id = nextId
  nextId += 1
  items = [...items, { id, tone, message: text }].slice(-MAX_TOASTS)
  emit()
  announce(tone === 'error' ? `Error: ${text}` : text)
  return id
}

export function dismissToast(id: number): void {
  if (!items.some((item) => item.id === id)) return
  items = items.filter((item) => item.id !== id)
  emit()
}

export function clearToasts(): void {
  if (items.length === 0) return
  items = EMPTY
  emit()
}

export function subscribeToToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToastSnapshot(): readonly ToastItem[] {
  return items
}

export function getToastServerSnapshot(): readonly ToastItem[] {
  return EMPTY
}
