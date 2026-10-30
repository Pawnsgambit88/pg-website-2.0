import type { Metadata } from 'next'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'
import { routeMetadata } from '@/lib/routes/metadata'

export const metadata: Metadata = routeMetadata('handoff-states')

export default function Page() {
  return <PlaceholderPage routeId="handoff-states" />
}
