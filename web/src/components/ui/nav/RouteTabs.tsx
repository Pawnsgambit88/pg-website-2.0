'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { ChevronLeft } from '@/components/ui/icons/ChevronLeft'
import { ChevronRight } from '@/components/ui/icons/ChevronRight'
import type { LinkHref } from '@/components/ui/linkHref'
import { cn } from '@/lib/cn'

export interface RouteTabItem {
  href: LinkHref
  label: ReactNode
  /** Active only on this exact path (use for an index/overview tab). Default: active on the path and its children. */
  exact?: boolean
}

interface RouteTabsProps {
  items: readonly RouteTabItem[]
  /** Accessible name of the navigation landmark ("Event sections"). */
  label: string
  /** Current path. Omit to read it from the router (usePathname). */
  currentPath?: string
  /** Colour the edge fades blend into, so they match the surface behind the strip. */
  surface?: 'parchment' | 'admin'
  className?: string
}

function pathOf(href: LinkHref): string {
  if (typeof href === 'string') return href.split(/[?#]/)[0] ?? ''
  return href.pathname ?? ''
}

function isActive(item: RouteTabItem, path: string): boolean {
  const target = pathOf(item.href).replace(/\/+$/, '') || '/'
  const current = path.replace(/\/+$/, '') || '/'
  if (item.exact === true || target === '/') return current === target
  return current === target || current.startsWith(`${target}/`)
}

const FADE_FROM: Record<'parchment' | 'admin', string> = {
  parchment: 'from-parchment',
  admin: 'from-admin-bg',
}

/**
 * Route-linked tabs (ARCH-001 15): a `<nav>` of real links, each tab its own URL, the current one marked
 * `aria-current="page"`. Not Radix tabs: the page owns the content, so there is no tablist/tabpanel. It is a client
 * island only to read the pathname (or take `currentPath`) and to drive the scroll.
 * 320px: the strip scrolls horizontally with scroll-snap, and the active tab is centred on mount and on route change
 * (scrollLeft only, the page never jumps; instant under reduced motion). Edge hints are a fade plus a chevron, shown
 * only while more tabs lie that way, absolutely positioned so nothing shifts. The active tab also has a 2px underline,
 * so colour is not the only cue. Links are 44px tall.
 */
export function RouteTabs({ items, label, currentPath, surface = 'parchment', className }: RouteTabsProps) {
  const routerPath = usePathname()
  const path = currentPath ?? routerPath
  const scroller = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setMore((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[aria-current="page"]')
    if (active) {
      const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' })
    }
    measure()
  }, [path, measure])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const fade = cn(
    'pointer-events-none absolute inset-y-0 flex w-8 items-center to-transparent text-ink-soft',
    FADE_FROM[surface],
  )

  return (
    <nav aria-label={label} className={cn('relative border-b border-line', className)}>
      <div
        ref={scroller}
        onScroll={measure}
        className="flex snap-x snap-proximity gap-1 overflow-x-auto overscroll-x-contain"
      >
        {items.map((item, index) => {
          const active = isActive(item, path)
          return (
            <PrefetchLink
              key={index}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px inline-flex min-h-11 shrink-0 snap-center items-center border-b-2 px-4 py-2 type-button whitespace-nowrap',
                active
                  ? 'border-copper-dark text-ink'
                  : 'border-transparent text-ink-soft hover:border-line hover:text-ink',
              )}
            >
              {item.label}
            </PrefetchLink>
          )
        })}
      </div>
      {more.start ? (
        <span aria-hidden="true" className={cn(fade, 'left-0 justify-start bg-linear-to-r')}>
          <ChevronLeft size="sm" />
        </span>
      ) : null}
      {more.end ? (
        <span aria-hidden="true" className={cn(fade, 'right-0 justify-end bg-linear-to-l')}>
          <ChevronRight size="sm" />
        </span>
      ) : null}
    </nav>
  )
}
