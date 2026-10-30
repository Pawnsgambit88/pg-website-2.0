'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import type { DirtyStore } from '@/features/player/shared/dirty-store'

interface UnsavedChangesGuardProps {
  store: DirtyStore
}

/** Same-origin navigation target of a plain left click on a link, or null when the click is not a page change. */
function navigationTarget(event: MouseEvent): { href: string; route: Route } | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null
  }
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (anchor === null) return null
  const target = anchor.getAttribute('target')
  if ((target !== null && target !== '_self') || anchor.hasAttribute('download')) return null
  const url = new URL(anchor.getAttribute('href') ?? '', window.location.href)
  if (url.origin !== window.location.origin) return null
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null
  return { href: url.href, route: `${url.pathname}${url.search}${url.hash}` as Route }
}

/**
 * Warns before unsaved edits are lost (TASK-068). Two doors are covered:
 *   1. closing, reloading or leaving the site: the browser's own `beforeunload` prompt;
 *   2. in-app links (nav, logo, any `<a>`): a capture-phase click listener stops the navigation and opens a
 *      ConfirmDialog whose safe action ("Stay") has focus; "Leave" navigates with the router.
 * Not covered: the browser Back button and non-link controls such as Sign out (the App Router has no route-blocking
 * API); those keep the data only until the next page, same as any form.
 * Subscribes to the dirty store only, so it re-renders when the page flips between clean and dirty, never per keystroke.
 */
export function UnsavedChangesGuard({ store }: UnsavedChangesGuardProps) {
  const router = useRouter()
  const dirty = useSyncExternalStore(store.subscribe, store.isDirty, () => false)
  const [pending, setPending] = useState<Route | null>(null)

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      const next = navigationTarget(event)
      if (next === null) return
      event.preventDefault()
      event.stopPropagation()
      setPending(next.route)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null)
      }}
      onConfirm={() => {
        const destination = pending
        setPending(null)
        if (destination !== null) router.push(destination)
      }}
      title="Leave without saving?"
      consequence="You have changes that are not saved. If you leave now, they will be lost."
      confirmLabel="Leave page"
      cancelLabel="Stay and keep editing"
      destructive
    />
  )
}
