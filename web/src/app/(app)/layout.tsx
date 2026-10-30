import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClientProviders } from '@/components/layout/ClientProviders'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { PlayerShell } from '@/components/layout/PlayerShell'
import { RouteFocus } from '@/components/layout/RouteFocus'
import { SkipLink } from '@/components/layout/SkipLink'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { WebVitals } from '@/lib/observe/WebVitals'
import { NOINDEX_METADATA } from '@/lib/routes/metadata'

// Client group: dynamic shell (ARCH-001 7.2). ClientProviders (Query, Auth, live region, toasts) from TASK-023;
// RequireAuth (TASK-024) gates the shell and the page content: a skeleton while the session loads, /login?returnTo=
// when signed out. PlayerShell (TASK-037) sits inside it, so the player nav and name never render for a guest, and the
// single <main> wraps only the page content, never the nav. While the session loads, RequireAuth (ownLandmark) puts
// the skeleton or error state in its own <main>, so the page always has exactly one main landmark.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = NOINDEX_METADATA

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <ClientProviders>
        <RouteFocus />
        <RequireAuth ownLandmark>
          <PlayerShell>
            <MainLandmark>{children}</MainLandmark>
          </PlayerShell>
        </RequireAuth>
      </ClientProviders>
      <WebVitals />
    </>
  )
}
