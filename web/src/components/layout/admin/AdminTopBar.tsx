import { BrandMark } from '@/components/layout/BrandMark'
import { AdminMobileMenu } from '@/components/layout/admin/AdminMobileMenu'
import { AdminPageTitle } from '@/components/layout/admin/AdminPageTitle'

/** Mobile admin bar (below 960px): brand, current section, menu button that opens the drawer. */
export function AdminTopBar() {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-parchment/95 pt-safe px-safe backdrop-blur-lg md:hidden">
      <div className="flex min-h-14 items-center gap-3 px-gutter">
        <BrandMark compact />
        <AdminPageTitle />
        <AdminMobileMenu />
      </div>
    </header>
  )
}
