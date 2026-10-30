'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { MAIN_ID } from '@/lib/routes/landmarks'

/**
 * Focus management for client navigation in the client groups (ARCH-001 15, WCAG 2.4.3). After the pathname changes,
 * focus moves to the page `h1` (or `<main>` when there is none) so keyboard and screen-reader users start at the new
 * content. Not run on the first render (a hard load keeps the browser default) and not on query-only changes.
 * The document title comes from each page's metadata; Next's built-in route announcer reads it out.
 */
export function RouteFocus() {
  const pathname = usePathname()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const main = document.getElementById(MAIN_ID)
    if (main === null) return
    const heading = main.querySelector<HTMLElement>('h1')
    const target = heading ?? main
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }, [pathname])

  return null
}
