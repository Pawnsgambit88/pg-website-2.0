import type { Metadata } from 'next'
import { CommunityHero } from '@/components/public/community/CommunityHero'
import { CommunityHospitality } from '@/components/public/community/CommunityHospitality'
import { CommunityPrinciples } from '@/components/public/community/CommunityPrinciples'
import { getSiteSection } from '@/lib/data/public/site-section'
import { metaDescription } from '@/lib/seo/description'
import { buildMetadata, type SeoImage } from '@/lib/seo/metadata'

// Community (screen 06, TASK-046). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3) and the
// `site:community` tag (set by getSiteSection) revalidates it on publish. No request APIs. The reference has no
// testimonials on this screen, so none are read here. A failed CMS read throws to the (public) error boundary, so ISR
// keeps the last good page (ARCH-001 7.6); content is never replaced by empty copy.
export const revalidate = 900

const PATH = '/community'

export async function generateMetadata(): Promise<Metadata> {
  // Shares the React.cache entry with the page.
  const { hero } = (await getSiteSection('community')).content
  const photo = hero.media.items[0]
  const image: SeoImage | null =
    photo === undefined ? null : { src: photo.src, width: photo.width, height: photo.height, alt: photo.alt }
  return buildMetadata({
    title: 'Community',
    description: metaDescription([hero.headline, hero.lead]),
    path: PATH,
    image,
  })
}

export default async function CommunityPage() {
  const { content } = await getSiteSection('community')

  // Each section gets only its own slice (RBP server-serialization).
  return (
    <>
      <CommunityHero content={content.hero} />
      <CommunityPrinciples principles={content.principles} />
      <CommunityHospitality content={content.hospitality} />
    </>
  )
}
