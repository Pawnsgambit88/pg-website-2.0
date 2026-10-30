'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AdminNavList } from '@/components/layout/admin/AdminNavList'
import { PlayerAccount } from '@/components/layout/player/PlayerAccount'
import { SignOutButton } from '@/components/layout/player/SignOutButton'
import { TextLink } from '@/components/ui/TextLink'
import { Menu } from '@/components/ui/icons/Menu'
import { Sheet } from '@/components/ui/overlay/Sheet'

/**
 * Mobile admin menu (below 960px): the sidebar becomes a Sheet drawer. Closes on link click and on every pathname change
 * ("adjust state during render", no effect). Focus trap, Escape and focus return come from Sheet.
 */
export function AdminMobileMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openedOn, setOpenedOn] = useState(pathname)

  if (openedOn !== pathname) {
    setOpenedOn(pathname)
    if (open) setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Admin menu"
      side="right"
      closeLabel="Close menu"
      trigger={
        <button
          type="button"
          className="inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center gap-2 rounded-public px-2 type-button text-ink hover:bg-line"
        >
          <Menu />
          <span className="sr-only xs:not-sr-only">Menu</span>
        </button>
      }
    >
      <div className="flex min-h-full flex-col gap-8">
        <PlayerAccount tone="light" />
        <AdminNavList variant="drawer" onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex flex-col gap-4">
          <TextLink href="/app">Player home</TextLink>
          <SignOutButton />
        </div>
      </div>
    </Sheet>
  )
}
