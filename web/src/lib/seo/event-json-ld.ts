// schema.org Event JSON-LD for /events/[slug] (TASK-112, ARCH-001 8.2, FEAT-001 AC-12, OQ-08). Pure, no directive.
//
// Missing fields are OMITTED, never emitted empty (EC-02). Dates are ISO 8601 on the IST wall clock with +05:30.
// `offers.availability` is the last-known state at render time (cached HTML can lag; revalidation on publish, sold out,
// close and cancel corrects it, ARCH-001 9.3). Render the result through <JsonLd data={...} />, never by hand.
import type { EventDetailDto } from '@/lib/api/types/event'
import type { AvailabilityState, PublicEventStatus } from '@/lib/api/types/event-state'
import type { MediaRef } from '@/lib/api/types/media'
import { toIstIsoString } from '@/lib/seo/ist-datetime'
import { organizationRef } from '@/lib/seo/organization-json-ld'
import type { JsonLdObject } from '@/lib/seo/serialize-json-ld'
import { absoluteUrl, canonicalUrl } from '@/lib/seo/site'

const SCHEMA = 'https://schema.org/'

/** Google uses up to a few images; more adds bytes to every cached page for no gain. */
const MAX_EVENT_IMAGES = 3

export type OfferAvailability = 'InStock' | 'SoldOut' | 'PreOrder' | 'Discontinued'

/**
 * Offer availability from the event status in the DTO (the cached, last-known state).
 * registration_open: InStock. sold_out: SoldOut. published (registration not yet open): PreOrder.
 * ongoing, completed, cancelled: Discontinued (no registration is possible).
 */
export function availabilityFromStatus(status: PublicEventStatus): OfferAvailability {
  switch (status) {
    case 'registration_open':
      return 'InStock'
    case 'sold_out':
      return 'SoldOut'
    case 'published':
      return 'PreOrder'
    case 'ongoing':
    case 'completed':
    case 'cancelled':
      return 'Discontinued'
  }
}

/**
 * Offer availability from a live availability state, for a caller that has one (P04). The cached page normally does
 * not: the availability island is client-side. full_waitlist counts as SoldOut (no place, only a waitlist).
 */
export function availabilityFromState(state: AvailabilityState): OfferAvailability {
  switch (state) {
    case 'open':
      return 'InStock'
    case 'full_waitlist':
    case 'sold_out':
      return 'SoldOut'
    case 'not_yet_open':
      return 'PreOrder'
    case 'closed':
    case 'completed':
    case 'cancelled':
      return 'Discontinued'
  }
}

/**
 * Integer paise to a decimal rupee string for `offers.price`: 0 -> "0", 50000 -> "500", 150050 -> "1500.50".
 * Exact digit arithmetic, no floating point. `null` for a value that is not a non-negative safe integer.
 */
export function rupeesFromPaise(paise: number): string | null {
  if (!Number.isSafeInteger(paise) || paise < 0) return null
  const rupees = Math.floor(paise / 100)
  const remainder = paise % 100
  return remainder === 0 ? String(rupees) : `${rupees}.${String(remainder).padStart(2, '0')}`
}

function imageUrls(event: EventDetailDto): string[] {
  const refs: MediaRef[] = [...(event.cover === null ? [] : [event.cover]), ...event.media.items]
  const urls = refs.map((ref) => absoluteUrl(ref.src)).filter((url): url is string => url !== null)
  return [...new Set(urls)].slice(0, MAX_EVENT_IMAGES)
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function place(event: EventDetailDto): JsonLdObject {
  const { venue } = event
  const address: Record<string, string> = { '@type': 'PostalAddress' }
  if (nonEmpty(venue.address)) address.streetAddress = venue.address
  if (nonEmpty(venue.area)) address.addressRegion = venue.area
  if (nonEmpty(venue.city)) address.addressLocality = venue.city
  address.addressCountry = 'IN'
  return {
    '@type': 'Place',
    ...(nonEmpty(venue.venueName) ? { name: venue.venueName } : {}),
    address,
  }
}

export interface EventJsonLdOptions {
  /** A live availability state, when the caller has one. Default: derived from `event.status`. */
  availability?: AvailabilityState | undefined
}

/**
 * schema.org `Event`: name, description, startDate / endDate (+05:30), eventStatus (EventScheduled or EventCancelled),
 * eventAttendanceMode Offline, location Place with PostalAddress, image, offers (price in rupees, INR, availability,
 * url, validFrom), organizer.
 */
export function eventJsonLd(event: EventDetailDto, options: EventJsonLdOptions = {}): JsonLdObject {
  const url = canonicalUrl(`/events/${event.slug}`)
  const startDate = toIstIsoString(event.startsAt)
  const endDate = toIstIsoString(event.endsAt)
  const images = imageUrls(event)
  const price = rupeesFromPaise(event.price.pricePaise)
  const availability =
    options.availability === undefined
      ? availabilityFromStatus(event.status)
      : availabilityFromState(options.availability)
  const validFrom = event.registration.opensAt === null ? null : toIstIsoString(event.registration.opensAt)
  const description = nonEmpty(event.description) ? event.description : event.promise

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(nonEmpty(description) ? { description } : {}),
    url,
    ...(startDate === null ? {} : { startDate }),
    ...(endDate === null ? {} : { endDate }),
    eventStatus: `${SCHEMA}${event.status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: `${SCHEMA}OfflineEventAttendanceMode`,
    location: place(event),
    ...(images.length === 0 ? {} : { image: images }),
    ...(price === null
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: event.price.currency,
            availability: `${SCHEMA}${availability}`,
            url,
            ...(validFrom === null ? {} : { validFrom }),
          },
        }),
    organizer: organizationRef(),
  }
}
