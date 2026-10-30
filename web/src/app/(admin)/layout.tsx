import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/layout/AdminShell'
import { ClientProviders } from '@/components/layout/ClientProviders'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { RouteFocus } from '@/components/layout/RouteFocus'
import { SkipLink } from '@/components/layout/SkipLink'
import { RequireRole } from '@/features/auth/RequireRole'
import { WebVitals } from '@/lib/observe/WebVitals'
import { NOINDEX_METADATA } from '@/lib/routes/metadata'

// Client group: dynamic shell (ARCH-001 7.2). ClientProviders (Query, Auth, live region, toasts) from TASK-023;
// RequireRole('admin') (TASK-024) gates the shell and the page, so no admin
// component or data request mounts for a player or while the session loads (AC-05); the role comes from /auth/me.
// AdminShell (FE-13) sits inside it: sidebar or drawer, step-up dialog.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = NOINDEX_METADATA

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <ClientProviders>
        <RouteFocus />
        <RequireRole requiredRole="admin" ownLandmark>
          <AdminShell>
            <MainLandmark>{children}</MainLandmark>
          </AdminShell>
        </RequireRole>
      </ClientProviders>
      <WebVitals />
    </>
  )
}
