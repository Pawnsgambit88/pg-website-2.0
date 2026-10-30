'use client'

import { usePathname } from 'next/navigation'
import { adminPageTitle } from '@/components/layout/admin/adminNav'

/** Current section name in the mobile top bar. Plain text: the page owns its `h1`. */
export function AdminPageTitle() {
  const title = adminPageTitle(usePathname())
  return <p className="min-w-0 flex-1 truncate font-display text-lg leading-snug text-ink">{title}</p>
}
