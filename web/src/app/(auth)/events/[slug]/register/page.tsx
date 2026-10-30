import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { parseSlug } from '@/lib/api/types/primitives'
import { routeMetadata } from '@/lib/routes/metadata'
import { RegistrationRoute } from './RegistrationRoute'

export const metadata: Metadata = routeMetadata('register')

// Player-area route: the (auth) layout is dynamic and noindex. The public event page `/events/[slug]` stays static.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const slug = parseSlug((await params).slug)
  if (slug === null) notFound()
  return <RegistrationRoute slug={slug} />
}
