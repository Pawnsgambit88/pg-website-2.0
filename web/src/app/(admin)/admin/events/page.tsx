import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminEventsPage } from '@/features/admin/events/AdminEventsPage'
import { routeMetadata } from '@/lib/routes/metadata'

export const metadata: Metadata = routeMetadata('admin-events')

export default function Page() {
  return (
    <Suspense>
      <AdminEventsPage />
    </Suspense>
  )
}
