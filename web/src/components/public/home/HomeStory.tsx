import type { Route } from 'next'
import { Section } from '@/components/layout/Section'
import { HomeSectionImage } from '@/components/public/home/HomeSectionImage'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { HomeContentDto } from '@/lib/api/types/site-content'

interface HomeStoryProps {
  /** `moreThanAGame` block of the Home content. Its `cta` is the "Our story" link (fixture href `/community`). */
  content: HomeContentDto['moreThanAGame']
}

const TITLE_ID = 'home-story-title'

/**
 * "More than a game" section (reference `.story-static`): 4:3 photo beside copy aligned to the bottom edge, and the
 * "Our story" text link. The photo's inner element carries `data-motion="scale"` inside a clipping box. Colours: ink
 * heading on parchment (15.79), muted body (4.85), copper-dark link (5.56). Server Component.
 */
export function HomeStory({ content }: HomeStoryProps) {
  const { eyebrow, headline, body, cta, media } = content

  return (
    <Section aria-labelledby={TITLE_ID}>
      <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-2 md:gap-16">
        <HomeSectionImage media={media.items[0]} ratio="4:3" scale />
        <div data-motion="reveal" className="flex min-w-0 flex-col items-start gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={2} id={TITLE_ID}>
            {headline}
          </Heading>
          <Text className="max-w-prose">{body}</Text>
          <TextLink href={cta.href as Route} icon={<ArrowRight size="sm" className="self-center" />} className="mt-2">
            {cta.label}
          </TextLink>
        </div>
      </div>
    </Section>
  )
}
