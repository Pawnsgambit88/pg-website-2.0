import type { Route } from 'next'

// Player area navigation (TASK-037; reference screen 22 `.static-sidebar nav`). Pure data and helpers, no directive:
// safe on server and client. The same list feeds the desktop sidebar and the mobile drawer.

export interface PlayerNavItem {
  label: string
  href: Route
  /** Active on this exact path only (`/app` must not light up on `/app/events`). */
  exact: boolean
}

export const PLAYER_NAV_ITEMS: readonly PlayerNavItem[] = [
  { label: 'My PG', href: '/app', exact: true },
  { label: 'My events', href: '/app/events', exact: false },
  { label: 'Rating', href: '/app/rating', exact: false },
  { label: 'Profile', href: '/app/profile', exact: false },
]

/** Accessible name of the player navigation landmark (sidebar and drawer). */
export const PLAYER_NAV_LABEL = 'Player'

function normalise(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

/** True when `item` is the current page or, for non-exact items, a parent of it (`/app/events/[id]` is My events). */
export function isPlayerNavActive(item: PlayerNavItem, pathname: string): boolean {
  const current = normalise(pathname)
  if (item.exact) return current === item.href
  return current === item.href || current.startsWith(`${item.href}/`)
}

/** Label of the active nav item, shown as the mobile top bar title; undefined outside the four sections. */
export function playerPageTitle(pathname: string): string | undefined {
  return PLAYER_NAV_ITEMS.find((item) => isPlayerNavActive(item, pathname))?.label
}
