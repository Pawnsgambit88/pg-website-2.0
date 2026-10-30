import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClientProviders } from '@/components/layout/ClientProviders'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { RouteFocus } from '@/components/layout/RouteFocus'
import { SkipLink } from '@/components/layout/SkipLink'
import { WebVitals } from '@/lib/observe/WebVitals'
import { NOINDEX_METADATA } from '@/lib/routes/metadata'

// Client group: a dynamic shell so the nonce CSP can be applied per request (ARCH-001 7.2). ClientProviders mounts
// Query, Auth, the live region and the toast host (TASK-023); RedirectIfAuthed arrives with TASK-024.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = NOINDEX_METADATA

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <ClientProviders>
        <RouteFocus />
        <MainLandmark>{children}</MainLandmark>
      </ClientProviders>
      <WebVitals />
    </>
  )
}
