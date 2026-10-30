import type { Route } from 'next'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { SiteSectionOf } from '@/lib/api/types/site-content'

interface CommunityHospitalityProps {
  content: SiteSectionOf<'community'>['content']['hospitality']
}

const TITLE_ID = 'community-hospitality-title'
const PLAY_PATH = '/play'

/**
 * Hospitality block (reference `.hospitality-static`): eyebrow and h2 on the left, body and the CMS call to action on
 * the right from `md`, stacked below. The reference pairs this copy with a photo, but the community content model has
 * no hospitality media field, so the block is copy-only (editorial split, hairline on top) rather than an empty tile.
 * The page always offers a way to Play: when the CMS action points elsewhere, a text link to `/play` follows it.
 * Server Component.
 */
export function CommunityHospitality({ content }: CommunityHospitalityProps) {
  const { eyebrow, headline, body, cta } = content
  const ctaIsPlay = cta.href === PLAY_PATH

  return (
    <Section aria-labelledby={TITLE_ID} space="flush">
      <div className="grid grid-cols-1 gap-6 border-t border-line pt-12 md:grid-cols-12 md:gap-16 md:pt-16">
        <div className="flex min-w-0 flex-col gap-3 md:col-span-6">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={2} id={TITLE_ID} className="max-w-xl">
            {headline}
          </Heading>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-6 md:col-span-6 md:pt-8">
          <Text className="max-w-prose">{body}</Text>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href={cta.href as Route} variant="primary" icon={<ArrowRight size="sm" />} iconPosition="end">
              {cta.label}
            </Button>
            {ctaIsPlay ? null : (
              <TextLink href={PLAY_PATH} icon={<ArrowRight size="sm" />}>
                Find your first game
              </TextLink>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}
