'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isWebUrl } from '@/components/ui/linkHref'
import { cn } from '@/lib/cn'

/** One public navigation entry. `href` is a site path or a safe absolute URL (already filtered by PublicNav). */
export interface PublicNavItem {
  label: string
  href: string
}

/**
 * True when `href` is the current section: exact match for `/`, otherwise the path itself or any child path
 * (`/play` is active on `/play` and `/play/anything`). Query and hash are ignored. External URLs are never active.
 */
export function isActivePath(href: string, pathname: string): boolean {
  if (!href.startsWith('/')) return false
  const target = (href.split(/[?#]/)[0] ?? '').replace(/\/+$/, '') || '/'
  const current = pathname.replace(/\/+$/, '') || '/'
  if (target === '/') return current === '/'
  return current === target || current.startsWith(`${target}/`)
}

interface PublicNavLinksProps {
  items: readonly PublicNavItem[]
  /** Accessible name of the navigation landmark. */
  label: string
}

/**
 * Desktop primary navigation (960px and up; the mobile menu island covers smaller widths). A client island only to read
 * the pathname for `aria-current="page"`: the static (public) layout has no request data, so the server cannot know the
 * active route. The links are still in the prerendered HTML (usePathname resolves during prerender). The active link
 * gets ink colour plus a 2px underline, so colour is never the only cue. Links are 44px tall.
 */
export function PublicNavLinks({ items, label }: PublicNavLinksProps) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="hidden md:block">
      <ul className="flex items-center gap-6">
        {items.map((item) => {
          const active = isActivePath(item.href, pathname)
          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href as Route}
                aria-current={active ? 'page' : undefined}
                {...(isWebUrl(item.href as Route) ? { rel: 'noopener noreferrer' } : {})}
                className={cn(
                  'inline-flex min-h-11 items-center text-sm whitespace-nowrap text-ink-soft',
                  'decoration-2 underline-offset-8 hover:text-ink',
                  'aria-[current=page]:font-strong aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-copper-dark',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
