'use client'

import { usePathname } from 'next/navigation'
import { playerPageTitle } from '@/components/layout/player/playerNav'

/**
 * Current section name in the mobile top bar ("My events"). Plain text, not a heading: the page owns its `h1`. Empty
 * outside the four sections; the brand next to it then stands alone. Truncates so the 320px bar stays on one line.
 */
export function PlayerPageTitle() {
  const title = playerPageTitle(usePathname())
  return <p className="min-w-0 flex-1 truncate font-display text-lg leading-snug text-ink">{title}</p>
}
