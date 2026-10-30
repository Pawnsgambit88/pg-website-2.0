import { BrandMark } from '@/components/layout/BrandMark'
import { AdminNavList } from '@/components/layout/admin/AdminNavList'
import { PlayerAccount } from '@/components/layout/player/PlayerAccount'
import { SignOutButton } from '@/components/layout/player/SignOutButton'
import { TextLink } from '@/components/ui/TextLink'

/** Desktop admin navigation (960px and up): persistent forest column, same look as the player sidebar. */
export function AdminSidebar() {
  return (
    <header
      data-surface="dark"
      className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col gap-12 overflow-y-auto overscroll-contain surface-dark pt-safe-6 pb-safe-6 pl-safe md:flex"
    >
      <div className="px-4">
        <BrandMark tone="dark" />
      </div>
      <div className="px-4">
        <AdminNavList variant="sidebar" />
      </div>
      <div className="mt-auto flex flex-col gap-4 border-t border-line-light px-4 pt-4">
        <PlayerAccount tone="dark" />
        <TextLink href="/app" tone="on-dark">
          Player home
        </TextLink>
        <SignOutButton />
      </div>
    </header>
  )
}
