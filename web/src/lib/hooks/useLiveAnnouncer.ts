'use client'

import { announce } from '@/lib/hooks/liveAnnouncerStore'

/**
 * Returns `announce(text)`, which speaks `text` once through the single polite live region (`LiveRegion`, mounted once
 * in each client layout). The function is stable and the hook subscribes to nothing, so callers never re-render
 * because of announcements.
 *
 * Announce state changes once (saved, failed, pairing published, payment confirmed). Never announce each poll or each
 * second of a countdown (ARCH-001 15, AC-90). Urgent errors use `role="alert"` on the visible message instead.
 * Without a mounted `LiveRegion` the call is harmless and silent.
 */
export function useLiveAnnouncer(): (text: string) => void {
  return announce
}
