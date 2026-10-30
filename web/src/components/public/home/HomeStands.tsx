import { Section } from '@/components/layout/Section'
import { HomeSectionImage } from '@/components/public/home/HomeSectionImage'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import type { HomeContentDto } from '@/lib/api/types/site-content'

interface HomeStandsProps {
  content: HomeContentDto['stands']
}

const TITLE_ID = 'home-stands-title'

/**
 * "What PG stands for" forest band (reference `.community-static`): copy beside a 4:5 photo, then the three principles
 * as a `ul` divided by light hairlines. Contrast on forest: parchment headings 11.74, parchment-muted body 6.59 (`Text
 * tone="on-dark"`), copper-soft eyebrow 5.50 (automatic inside the dark surface). No muted or copper-dark text here.
 * Server Component.
 */
export function HomeStands({ content }: HomeStandsProps) {
  const { eyebrow, headline, body, principles, media } = content

  return (
    <Section tone="forest" aria-labelledby={TITLE_ID}>
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
        <div data-motion="reveal" className="flex min-w-0 flex-col gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={2} id={TITLE_ID} className="max-w-xl">
            {headline}
          </Heading>
          <Text tone="on-dark" className="max-w-prose">
            {body}
          </Text>
        </div>
        <HomeSectionImage media={media.items[0]} ratio="4:5" reveal className="mx-auto max-w-lg md:mx-0 md:max-w-none" />
      </div>

      <ul className="mt-12 grid grid-cols-1 gap-px bg-line-light sm:grid-cols-3">
        {principles.map((principle) => (
          <li key={principle.title} className="min-w-0 bg-forest p-6 sm:p-8">
            <div data-motion="reveal" className="flex flex-col gap-2">
              <Heading level={3}>{principle.title}</Heading>
              <Text tone="on-dark">{principle.body}</Text>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
