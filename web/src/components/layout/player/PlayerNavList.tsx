'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PLAYER_NAV_ITEMS, PLAYER_NAV_LABEL, isPlayerNavActive } from '@/components/layout/player/playerNav'
import { cn } from '@/lib/cn'

interface PlayerNavListProps {
  /** `sidebar`: compact rows on the forest sidebar. `drawer`: large rows on parchment inside the mobile Sheet. */
  variant: 'sidebar' | 'drawer'
  /** Called when a link is activated (the drawer closes itself). */
  onNavigate?: () => void
}

// Written out in full for the Tailwind scanner. The current page is never colour alone: the sidebar adds a 2px copper
// left bar, a tinted row and strong weight; the drawer adds a 2px copper-dark underline and strong weight.
const LINK_CLASS = {
  sidebar: cn(
    'flex min-h-tap items-center border-l-2 border-transparent px-3 text-sm text-parchment-muted',
    'hover:bg-forest-soft hover:text-parchment',
    'aria-[current=page]:border-copper aria-[current=page]:bg-forest-soft aria-[current=page]:font-strong aria-[current=page]:text-parchment',
  ),
  drawer: cn(
    'flex min-h-12 items-center py-3 font-display text-2xl leading-snug text-ink',
    'decoration-2 underline-offset-8 hover:text-forest-soft',
    'aria-[current=page]:font-strong aria-[current=page]:underline aria-[current=page]:decoration-copper-dark',
  ),
} as const

/**
 * The four player sections (My PG, My events, Rating, Profile) with `aria-current="page"` on the current one. A client
 * leaf only to read the pathname. Targets are at least 44px (sidebar) and 48px (drawer).
 */
export function PlayerNavList({ variant, onNavigate }: PlayerNavListProps) {
  const pathname = usePathname()
  return (
    <nav aria-label={PLAYER_NAV_LABEL}>
      <ul className={variant === 'sidebar' ? 'flex flex-col gap-1' : 'flex flex-col border-t border-line'}>
        {PLAYER_NAV_ITEMS.map((item) => (
          <li key={item.href} className={variant === 'drawer' ? 'border-b border-line' : undefined}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isPlayerNavActive(item, pathname) ? 'page' : undefined}
              className={LINK_CLASS[variant]}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
