import { BrandMark } from '@/components/layout/BrandMark'
import { PlayerMobileMenu } from '@/components/layout/player/PlayerMobileMenu'
import { PlayerPageTitle } from '@/components/layout/player/PlayerPageTitle'

/**
 * Mobile player bar (below 960px; RESPONSIVE-BEHAVIOR "Player shell": compact top bar plus menu). Sticky, translucent
 * parchment with a hairline border, top and side safe-area insets. Brand roundel (wordmark from 480px), the current
 * section name, and the 44px menu trigger. Kept to one 56px row so page essentials (event room, check-in) stay in the
 * first viewport and never sit behind the menu. Hidden from 960px, where PlayerSidebar takes over. Server Component.
 */
export function PlayerTopBar() {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-parchment/95 pt-safe px-safe backdrop-blur-lg md:hidden">
      <div className="flex min-h-14 items-center gap-3 px-gutter">
        <BrandMark compact />
        <PlayerPageTitle />
        <PlayerMobileMenu />
      </div>
    </header>
  )
}
