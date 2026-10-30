'use client'

import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { useAuthUser } from '@/features/auth/useAuth'

interface PlayerAccountProps {
  /** `dark` on the forest sidebar, `light` on the parchment drawer. */
  tone: 'light' | 'dark'
}

/**
 * The signed-in player's initials avatar, name and account type (reference `.static-sidebar__foot`). Rendered only
 * inside RequireAuth, so the user is present; a missing name still falls back to "Player". Subscribes to the user only.
 */
export function PlayerAccount({ tone }: PlayerAccountProps) {
  const user = useAuthUser()
  const name = user?.name ?? 'Player'
  const accountType = user?.role === 'admin' ? 'Admin account' : 'Player account'
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* The name is visible next to it, so the avatar is not announced a second time. */}
      <Avatar name={name} size="sm" decorative />
      <div className="min-w-0">
        <p className={cn('text-sm font-strong wrap-break-word', tone === 'dark' ? 'text-parchment' : 'text-ink')}>
          {name}
        </p>
        <p className={cn('text-label', tone === 'dark' ? 'text-parchment-muted' : 'text-muted')}>{accountType}</p>
      </div>
    </div>
  )
}
