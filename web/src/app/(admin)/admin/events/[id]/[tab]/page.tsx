import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ControlFrame } from '@/features/event-control/ControlFrame'
import { routeMetadata } from '@/lib/routes/metadata'
import { isAdminEventTab, isValidEntityId } from '@/lib/routes/params'

export const metadata: Metadata = routeMetadata('event-control')

export default async function Page({ params }: { params: Promise<{ id: string; tab: string }> }) {
  const { id, tab } = await params
  if (!isValidEntityId(id) || !isAdminEventTab(tab)) notFound()
  return <ControlFrame eventId={id} tab={tab} />
}
