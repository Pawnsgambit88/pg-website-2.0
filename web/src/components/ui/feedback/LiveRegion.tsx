'use client'

import { useSyncExternalStore } from 'react'
import {
  getAnnouncementServerSnapshot,
  getAnnouncementSnapshot,
  subscribeToAnnouncements,
} from '@/lib/hooks/liveAnnouncerStore'

/**
 * The one polite live region (ARCH-001 15). Mount it exactly once per client layout (auth, app, admin), before any
 * content that announces, so it exists in the DOM when the first announcement arrives. Visually hidden, not
 * `display: none`, because assistive technology ignores hidden regions. Text comes from `useLiveAnnouncer`.
 */
export function LiveRegion() {
  const message = useSyncExternalStore(subscribeToAnnouncements, getAnnouncementSnapshot, getAnnouncementServerSnapshot)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
