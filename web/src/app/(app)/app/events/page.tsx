import type { Metadata } from 'next'
import { routeMetadata } from '@/lib/routes/metadata'
import { MyEventsPage } from '@/features/player/events/MyEventsPage'

export const metadata: Metadata = routeMetadata('my-events')

export default function Page() {
  return <MyEventsPage />
}
