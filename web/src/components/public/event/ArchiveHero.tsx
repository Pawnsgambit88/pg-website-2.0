import type { Route } from 'next'
import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import type { MediaRef } from '@/lib/api/types/media'
import { EventHeroMedia } from './EventHeroMedia'
import { HeroFacts, type HeroFact } from './HeroFacts'

interface ArchiveHeroProps {
  titleId: string
  eyebrow: string
  title: string
  promise: string
  facts: readonly HeroFact[]
  /** In-page anchor of the standings; null hides the button (no standings published). */
  resultsHref: string | null
  media: MediaRef | null
}

/**
 * Event hero, archive mode (reference screen 04): "Past event" eyebrow, h1, promise, facts (players, rounds, format,
 * winner) and a secondary "See final standings" anchor. No registration action anywhere. Server Component.
 */
export function ArchiveHero({ titleId, eyebrow, title, promise, facts, resultsHref, media }: ArchiveHeroProps) {
  return (
    <section aria-labelledby={titleId} className="pt-6 pb-8 md:py-16">
      <Shell className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-16">
        <div className="order-2 min-w-0 md:order-1 md:col-span-5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading level={1} size="hero" id={titleId} className="mt-3 mb-4">
            {title}
          </Heading>
          {promise.trim() === '' ? null : <Text variant="lead">{promise}</Text>}
          <HeroFacts facts={facts} className="my-6" />
          {resultsHref === null ? null : (
            <Button href={resultsHref as Route} variant="secondary">
              See final standings
            </Button>
          )}
        </div>
        <div className="order-1 min-w-0 md:order-2 md:col-span-7">
          <EventHeroMedia media={media} />
        </div>
      </Shell>
    </section>
  )
}
