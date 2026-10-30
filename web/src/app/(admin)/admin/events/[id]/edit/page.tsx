import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EditEventPage } from '@/features/event-builder/EditEventPage'
import { routeMetadata } from '@/lib/routes/metadata'
import { isValidEntityId } from '@/lib/routes/params'

export const metadata: Metadata = routeMetadata('event-edit')

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidEntityId(id)) notFound()
  return <EditEventPage eventId={id} />
}
