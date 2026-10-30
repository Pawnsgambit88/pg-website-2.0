import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { Carousel } from '@/components/ui/carousel/Carousel'
import type { SiteSectionOf } from '@/lib/api/types/site-content'

interface CommunityHeroProps {
  content: SiteSectionOf<'community'>['content']['hero']
}

const TITLE_ID = 'community-hero-title'

/**
 * Community opening band (screen 06, reference `.community-static`): forest surface, eyebrow, the page h1 and the lead
 * beside the section photo. Stacks below 960px (copy first). The media collection decides static or carousel
 * (F-PUB-012): 0 items render the empty tile at the same ratio, 1 item a plain frame, 2+ in carousel mode the
 * accessible carousel. The first photo is the page's single `priority` image (LCP). Text on forest: parchment heading,
 * parchment-muted lead (`Text tone="on-dark"`), copper-soft eyebrow (automatic). Server Component.
 */
export function CommunityHero({ content }: CommunityHeroProps) {
  const { eyebrow, headline, lead, media } = content

  return (
    <section aria-labelledby={TITLE_ID} data-surface="dark" className="surface-dark py-16 sm:py-24">
      <div className="shell grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex min-w-0 flex-col gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={1} size="hero" id={TITLE_ID} className="max-w-2xl">
            {headline}
          </Heading>
          <Text tone="on-dark" className="max-w-prose">
            {lead}
          </Text>
        </div>
        <Carousel media={media} label="Photos from PG community nights" slot="split" ratio="4:3" priority />
      </div>
    </section>
  )
}
