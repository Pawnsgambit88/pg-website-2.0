import { BrandMark } from '@/components/layout/BrandMark'
import { PlayerAccount } from '@/components/layout/player/PlayerAccount'
import { PlayerNavList } from '@/components/layout/player/PlayerNavList'
import { SignOutButton } from '@/components/layout/player/SignOutButton'
import { TextLink } from '@/components/ui/TextLink'

/**
 * Desktop player navigation (960px and up; reference `.static-sidebar`): a persistent 248px forest column, sticky to
 * the viewport and scrolling on its own when the window is short. Brand on top, the four sections, then the account,
 * the link back to the public site and Sign out at the foot. `data-surface="dark"` switches the Button and the focus
 * ring to their dark-surface variants. Hidden (display none, so also out of the accessibility tree) below 960px, where
 * PlayerTopBar takes over. Server Component; the nav, account and sign-out are client leaves.
 */
export function PlayerSidebar() {
  return (
    <header
      data-surface="dark"
      className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col gap-12 overflow-y-auto overscroll-contain surface-dark pt-safe-6 pb-safe-6 pl-safe md:flex"
    >
      <div className="px-4">
        <BrandMark tone="dark" />
      </div>
      <div className="px-4">
        <PlayerNavList variant="sidebar" />
      </div>
      <div className="mt-auto flex flex-col gap-4 border-t border-line-light px-4 pt-4">
        <PlayerAccount tone="dark" />
        <TextLink href="/play" tone="on-dark">
          Back to Play
        </TextLink>
        <SignOutButton />
      </div>
    </header>
  )
}
