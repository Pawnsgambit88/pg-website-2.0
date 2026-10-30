import type { Route } from 'next'
import { Section } from '@/components/layout/Section'
import { Stack } from '@/components/layout/Stack'
import { HomeSectionImage } from '@/components/public/home/HomeSectionImage'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { HomeContentDto } from '@/lib/api/types/site-content'

interface HomeFirstVisitProps {
  content: HomeContentDto['firstVisit']
}

const TITLE_ID = 'home-first-visit-title'

/** Two-digit numeral for the decorative promise index ("01" to "04"). */
function numeral(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * "First time?" section (reference `.hospitality-static` and `.promise-grid`): 4:3 photo beside the copy and the
 * `/welcome` CTA, then the four promises as an ordered list in a hairline grid. The `ol` supplies the numbering to
 * assistive technology, so the visible mono numerals are `aria-hidden`. Colours: ink headings on parchment-soft cells
 * (17.06), muted body (5.24), copper-dark numerals (6.01). Server Component.
 */
export function HomeFirstVisit({ content }: HomeFirstVisitProps) {
  const { eyebrow, headline, body, cta, promises, media } = content

  return (
    <Section aria-labelledby={TITLE_ID}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <HomeSectionImage media={media.items[0]} ratio="4:3" reveal />
        <div data-motion="reveal" className="flex min-w-0 flex-col items-start gap-6 md:self-center">
          <Stack gap="md">
            <Eyebrow>{eyebrow}</Eyebrow>
            <Heading level={2} id={TITLE_ID}>
              {headline}
            </Heading>
            <Text className="max-w-prose">{body}</Text>
          </Stack>
          <Button href={cta.href as Route} icon={<ArrowRight size="sm" />} iconPosition="end">
            {cta.label}
          </Button>
        </div>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {promises.map((promise, index) => (
          <li key={promise.title} className="min-w-0 bg-parchment-soft p-6">
            <div data-motion="reveal" className="flex flex-col">
              <span aria-hidden="true" className="font-mono text-eyebrow text-copper-dark">
                {numeral(index)}
              </span>
              <Heading level={3} className="mt-8 mb-2">
                {promise.title}
              </Heading>
              <Text>{promise.body}</Text>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}
