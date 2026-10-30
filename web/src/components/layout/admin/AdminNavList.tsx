'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV_ITEMS, ADMIN_NAV_LABEL, isAdminNavActive } from '@/components/layout/admin/adminNav'
import { cn } from '@/lib/cn'

interface AdminNavListProps {
  variant: 'sidebar' | 'drawer'
  onNavigate?: () => void
}

const LINK_CLASS = {
  sidebar: cn(
    'flex min-h-tap items-center border-l-2 border-transparent px-3 text-sm text-parchment-muted',
    'hover:bg-forest-soft hover:text-parchment',
    'aria-[current=page]:border-copper aria-[current=page]:bg-forest-soft aria-[current=page]:font-strong aria-[current=page]:text-parchment',
  ),
  drawer: cn(
    'flex min-h-12 items-center py-3 font-display text-xl leading-snug text-ink',
    'decoration-2 underline-offset-8 hover:text-forest-soft',
    'aria-[current=page]:font-strong aria-[current=page]:underline aria-[current=page]:decoration-copper-dark',
  ),
} as const

/** The admin sections with `aria-current="page"` on the current one. Client leaf only to read the pathname. */
export function AdminNavList({ variant, onNavigate }: AdminNavListProps) {
  const pathname = usePathname()
  return (
    <nav aria-label={ADMIN_NAV_LABEL}>
      <ul className={variant === 'sidebar' ? 'flex flex-col gap-1' : 'flex flex-col border-t border-line'}>
        {ADMIN_NAV_ITEMS.map((item) => (
          <li key={item.href} className={variant === 'drawer' ? 'border-b border-line' : undefined}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isAdminNavActive(item, pathname) ? 'page' : undefined}
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
