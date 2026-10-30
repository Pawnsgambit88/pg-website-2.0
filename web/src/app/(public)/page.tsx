import type { Metadata } from 'next'
import { HomeFinalCta } from '@/components/public/home/HomeFinalCta'
import { HomeFirstVisit } from '@/components/public/home/HomeFirstVisit'
import { HomeHero } from '@/components/public/home/HomeHero'
import { HomeStands } from '@/components/public/home/HomeStands'
import { HomeStory } from '@/components/public/home/HomeStory'
import { HomeUpcoming } from '@/components/public/home/HomeUpcoming'
import { HomeMotion } from '@/components/ui/motion/gsap/HomeMotion'
import type { EventCardDto } from '@/lib/api/types/event'
import { getHomeContent, getUpcomingEventsForHome } from '@/lib/data/public/home-content'
import { getSiteSection } from '@/lib/data/public/site-section'
import { metaDescription } from '@/lib/seo/description'
import { JsonLd } from '@/lib/seo/JsonLd'
import { buildMetadata, type SeoImage } from '@/lib/seo/metadata'
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo/organization-json-ld'
import { SITE_NAME } from '@/lib/seo/site'

// Home (screen 01, HOME-PAGE-PLAN HOME-07). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3)
// and the `site:home` / `events` tags revalidate on demand. No request APIs, so `/` stays prerenderable.
export const revalidate = 900

const HOME_PATH = '/'
/** Tagline half of the Home title (plan section 8). The CMS `meta` section has no field for it; the city comes from meta. */
const TITLE_TAGLINE = 'Social chess in'
const FALLBACK_CITY = 'Hyderabad'

export async function generateMetadata(): Promise<Metadata> {
  // Both reads start together; `home` shares its React.cache entry with the page, `meta` is a tagged, cached read.
  // Home content failing throws (the page would fail the same way); a failed `meta` read falls back to literals.
  const [home, metaResult] = await Promise.all([getHomeContent(), settle(getSiteSection('meta'))])
  const meta = metaResult.status === 'fulfilled' ? metaResult.value.content : null
  const hero = home.content.hero

  const siteName = meta?.siteName ?? SITE_NAME
  const city = meta?.defaultCity ?? FALLBACK_CITY
  const description = metaDescription([meta?.description]) ?? metaDescription([hero.lead, hero.body])

  const heroMedia = hero.media.items[0]
  const image: SeoImage | null =
    heroMedia === undefined
      ? null
      : { src: heroMedia.src, width: heroMedia.width, height: heroMedia.height, alt: heroMedia.alt }

  return buildMetadata({
    title: { absolute: `${siteName} | ${TITLE_TAGLINE} ${city}` },
    description,
    path: HOME_PATH,
    image,
  })
}

export default async function HomePage() {
  // Independent reads start together (RBP async-parallel, plan section 4). Home content is required: a rejection
  // throws to the route error boundary. Events degrade: a rejection becomes an inline message in HomeUpcoming.
  const [home, eventsResult] = await Promise.all([getHomeContent(), settle(getUpcomingEventsForHome())])
  const content = home.content

  let events: readonly EventCardDto[] = []
  let eventsError: unknown
  if (eventsResult.status === 'fulfilled') {
    events = eventsResult.value
  } else {
    // HomeUpcoming treats null/undefined as "no error", so never pass an empty rejection reason through.
    eventsError = eventsResult.reason ?? new Error('Upcoming events failed to load')
  }

  // Each section gets only its own DTO slice (RBP server-serialization).
  return (
    <>
      <HomeHero content={content.hero} />
      <HomeUpcoming content={content.upcoming} events={events} error={eventsError} />
      <HomeFirstVisit content={content.firstVisit} />
      <HomeStands content={content.stands} />
      <HomeStory content={content.moreThanAGame} />
      <HomeFinalCta content={content.finalCta} />
      {/* DEC-029: the one GSAP island, mounted on Home only; renders null. */}
      <HomeMotion />
      {/* Organization and WebSite only; Event JSON-LD belongs to event detail (plan section 8). */}
      <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
    </>
  )
}

/** Promise.allSettled semantics for one promise: never rejects, so it can sit inside a Promise.all next to a required read. */
function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  return promise.then(
    (value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }),
    (reason: unknown): PromiseSettledResult<T> => ({ status: 'rejected', reason }),
  )
}
