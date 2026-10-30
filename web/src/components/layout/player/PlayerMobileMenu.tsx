'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { PlayerAccount } from '@/components/layout/player/PlayerAccount'
import { PlayerNavList } from '@/components/layout/player/PlayerNavList'
import { SignOutButton } from '@/components/layout/player/SignOutButton'
import { TextLink } from '@/components/ui/TextLink'
import { Menu } from '@/components/ui/icons/Menu'
import { Sheet } from '@/components/ui/overlay/Sheet'

/**
 * Mobile player menu (below 960px): a 44px "Menu" button that opens the Sheet with the account, the four player
 * sections, the link back to the public site and Sign out. Sheet (Radix Dialog) supplies the focus trap, Escape, scroll
 * lock, inert background, safe-area padding and focus return to the trigger. The drawer closes on link click and on
 * every pathname change (also back/forward), using "adjust state during render" instead of an effect.
 */
export function PlayerMobileMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openedOn, setOpenedOn] = useState(pathname)

  if (openedOn !== pathname) {
    setOpenedOn(pathname)
    if (open) setOpen(false)
  }

  const close = () => setOpen(false)

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Menu"
      side="right"
      closeLabel="Close menu"
      trigger={
        <button
          type="button"
          className="inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center gap-2 rounded-public px-2 type-button text-ink hover:bg-line"
        >
          <Menu />
          {/* Visible from 480px; below that it stays the accessible name so the 320px bar fits on one line. */}
          <span className="sr-only xs:not-sr-only">Menu</span>
        </button>
      }
    >
      <div className="flex min-h-full flex-col gap-8">
        <PlayerAccount tone="light" />
        <PlayerNavList variant="drawer" onNavigate={close} />
        <div className="mt-auto flex flex-col gap-4">
          <TextLink href="/play">Back to Play</TextLink>
          <SignOutButton />
        </div>
      </div>
    </Sheet>
  )
}
