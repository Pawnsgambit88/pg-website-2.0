import type { Route } from 'next'

// Admin area navigation (FE-13). Pure data and helpers, no directive. One list feeds the desktop sidebar and the mobile drawer.
// Only top-level destinations are listed (9). The rest of the 13 admin routes in the manifest are reached from inside Events:
// /admin/events/new (builder), /admin/events/[id] (redirect), /admin/events/[id]/edit and /admin/events/[id]/[tab] (control room).

export interface AdminNavItem {
  label: string
  href: Route
  /** Active on this exact path only (`/admin` must not light up on `/admin/events`). */
  exact: boolean
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Events', href: '/admin/events', exact: false },
  { label: 'Website', href: '/admin/content', exact: false },
  { label: 'Media', href: '/admin/media', exact: false },
  { label: 'Stories', href: '/admin/stories', exact: false },
  { label: 'Testimonials', href: '/admin/testimonials', exact: false },
  { label: 'Players', href: '/admin/players', exact: false },
  { label: 'Payments', href: '/admin/payments', exact: false },
  { label: 'Settings', href: '/admin/settings', exact: false },
]

export const ADMIN_NAV_LABEL = 'Admin'

function normalise(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

export function isAdminNavActive(item: AdminNavItem, pathname: string): boolean {
  const current = normalise(pathname)
  if (item.exact) return current === item.href
  return current === item.href || current.startsWith(`${item.href}/`)
}

/** Label of the active section, shown as the mobile top bar title. */
export function adminPageTitle(pathname: string): string | undefined {
  return ADMIN_NAV_ITEMS.find((item) => isAdminNavActive(item, pathname))?.label
}
