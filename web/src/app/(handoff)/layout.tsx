import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { RouteFocus } from '@/components/layout/RouteFocus'
import { SkipLink } from '@/components/layout/SkipLink'
import { LiveRegion } from '@/components/ui/feedback/LiveRegion'
import { envPublic } from '@/lib/env/env.public'
import { NOINDEX_METADATA } from '@/lib/routes/metadata'

// Developer-only group (ARCH-001 7.1): 404 unless mocks are enabled. NEXT_PUBLIC_USE_MOCKS is a build-time constant and
// the build guard refuses mocks on production, so a production build always answers 404 here.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = NOINDEX_METADATA

export default function HandoffLayout({ children }: { children: ReactNode }) {
  if (!envPublic.USE_MOCKS) notFound()
  return (
    <>
      <SkipLink />
      <LiveRegion />
      <RouteFocus />
      <MainLandmark>{children}</MainLandmark>
    </>
  )
}
