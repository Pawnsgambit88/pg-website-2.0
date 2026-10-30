import type { ReactNode } from 'react'
import { PlayerSidebar } from '@/components/layout/player/PlayerSidebar'
import { PlayerTopBar } from '@/components/layout/player/PlayerTopBar'

interface PlayerShellProps {
  /** The page content, already wrapped in the group's single `<main>` (MainLandmark) by the layout. */
  children: ReactNode
}

/**
 * Signed-in player frame (TASK-037; reference screen 22 `.static-signed`; RESPONSIVE-BEHAVIOR "Player shell").
 *  - 960px and up: the persistent 248px PlayerSidebar on the left, the content column on the right.
 *  - below 960px: the sticky PlayerTopBar above the content; navigation and Sign out live in its menu drawer.
 * Only one of the two navigation headers is displayed at a time, so assistive technology meets one "Player" nav. The
 * shell never wraps the nav in `<main>`: the layout passes the main landmark in as `children`. Rendered inside
 * RequireAuth, so it mounts only for a confirmed session. Server Component composing small client leaves; it imports no
 * admin code.
 */
export function PlayerShell({ children }: PlayerShellProps) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <PlayerSidebar />
      <PlayerTopBar />
      <div className="min-w-0 flex-1 px-safe pb-safe md:pl-0">{children}</div>
    </div>
  )
}
