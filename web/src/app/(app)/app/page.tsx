import type { Metadata } from 'next'
import { routeMetadata } from '@/lib/routes/metadata'
import { DashboardPage } from '@/features/player/dashboard/DashboardPage'

export const metadata: Metadata = routeMetadata('player-home')

export default function Page() {
  return <DashboardPage />
}
