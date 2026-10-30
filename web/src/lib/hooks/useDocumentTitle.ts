'use client'

import { useEffect } from 'react'

/**
 * Sets `document.title` while the component is mounted and restores the previous title on unmount.
 * For client areas only (auth, app, admin), where the page is a client-rendered shell; public pages use the Next
 * `metadata` API so the title exists in the server HTML (ARCH-001 8.1). Pass the full title; the caller composes any suffix.
 * An empty title is ignored so a route never ends up untitled.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    if (title.trim() === '') return undefined
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
