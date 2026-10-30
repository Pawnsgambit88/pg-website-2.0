import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventArchiveView } from '@/components/public/event/EventArchiveView'
import { IncompleteDraftState } from '@/components/public/event/IncompleteDraftState'
import { EventOpenView } from '@/components/public/event/EventOpenView'
import { isOpenModeStatus } from '@/components/public/event/eventDecision'
import { pickNextEvent } from '@/components/public/event/nextEvent'
import type { EventCardDto } from '@/lib/api/types/event'
import { getEventBySlug, INCOMPLETE_DRAFT } from '@/lib/data/public/event-by-slug'
import { getPastEvents } from '@/lib/data/public/past-events'
import { getUpcomingEvents } from '@/lib/data/public/upcoming-events'
import { isValidSlug } from '@/lib/routes/params'
import { breadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld'
import { metaDescription } from '@/lib/seo/description'
import { eventJsonLd } from '@/lib/seo/event-json-ld'
import { JsonLd } from '@/lib/seo/JsonLd'
import { buildMetadata, type SeoImage } from '@/lib/seo/metadata'
import type { JsonLdObject } from '@/lib/seo/serialize-json-ld'

// Event detail (screens 03 and 04, TASK-043 / TASK-044). ISR (ARCH-001 7.1): upcoming plus the latest 50 completed are
// prerendered; other slugs render on demand and enter the cache on first hit. Tags `events`, `event:{slug}`,
// `past-events` come from getEventBySlug. No request APIs and no availability fetch here: live places are a client
// island (ARCH-001 9.6), the cached HTML shows last-known text only.
export const revalidate = 900
export const dynamicParams = true

const UPCOMING_PARAMS = 100
const PAST_PARAMS = 50

type Params = Promise<{ slug: string }>

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // Defence in depth: only slugs that pass the route rule become params (M13).
  const keep = (slug: string) => isValidSlug(slug)
  try {
    const [upcoming, past] = await Promise.all([getUpcomingEvents(1, UPCOMING_PARAMS), getPastEvents(1, PAST_PARAMS)])
    const slugs = [...upcoming.items, ...past.items].map((event) => event.slug).filter(keep)
    return [...new Set(slugs)].map((slug) => ({ slug }))
  } catch {
    // ARCH-001 7.6: a backend outage must not block a deploy; every page then renders on demand.
    return []
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  if (!isValidSlug(slug)) notFound()
  // Same React.cache entry as the page: one upstream request for metadata and render.
  const event = await getEventBySlug(slug)
  if (event === null) notFound()
  if (event === INCOMPLETE_DRAFT)
    return buildMetadata({ title: 'Incomplete draft', path: `/events/${slug}`, noindex: true })

  const media = event.cover ?? event.media.items[0] ?? null
  const image: SeoImage | null =
    media === null ? null : { src: media.src, width: media.width, height: media.height, alt: media.alt }

  return buildMetadata({
    title: event.title,
    description: metaDescription([event.promise, event.description]),
    path: `/events/${event.slug}`,
    image,
    // A cancelled event stays reachable with its notice but leaves the index (TASK-043 notes).
    noindex: event.status === 'cancelled',
  })
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params
  if (!isValidSlug(slug)) notFound()

  // Independent reads start together (RBP async-parallel). The next-game lookup degrades to null on failure.
  const [event, upcoming] = await Promise.all([
    getEventBySlug(slug),
    getUpcomingEvents().then(
      (page): readonly EventCardDto[] => page.items,
      (): readonly EventCardDto[] => [],
    ),
  ])
  if (event === null) notFound()
  if (event === INCOMPLETE_DRAFT) return <IncompleteDraftState />

  const next = pickNextEvent(upcoming, event.slug)
  const openMode = isOpenModeStatus(event.status)

  const ld = eventJsonLd(event)
  // Completed events: no offer (nothing can be bought); cancelled keeps EventCancelled from the builder.
  const eventLd: JsonLdObject = event.status === 'completed' ? withoutOffers(ld) : ld
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    openMode ? { name: 'Play', path: '/play' } : { name: 'Past events', path: '/past-events' },
    { name: event.title, path: `/events/${event.slug}` },
  ])

  return (
    <>
      {openMode ? <EventOpenView event={event} next={next} /> : <EventArchiveView event={event} next={next} />}
      <JsonLd data={[eventLd, crumbs]} />
    </>
  )
}

function withoutOffers(node: JsonLdObject): JsonLdObject {
  return Object.fromEntries(Object.entries(node).filter(([key]) => key !== 'offers'))
}
