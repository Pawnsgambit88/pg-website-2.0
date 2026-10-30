import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { routeMetadata } from '@/lib/routes/metadata'
import { isValidEntityId } from '@/lib/routes/params'
import { getPublicSettings } from '@/lib/data/public/public-settings'
import { EventRoom } from '@/features/player/event-room/EventRoom'

export const metadata: Metadata = routeMetadata('event-room')

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidEntityId(id)) notFound()

  // Fetch desk contact href (P12) so the "Message event desk" link is an offline-safe plain href (EV-06 AC).
  const settings = await getPublicSettings()

  return <EventRoom eventId={id} contactHref={settings.deskContactHref} />
}
