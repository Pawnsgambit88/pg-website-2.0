import type { Route } from 'next'
import { Shell } from '@/components/layout/Shell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import type { MediaRef } from '@/lib/api/types/media'
import { EventHeroMedia } from './EventHeroMedia'
import { HeroFacts, type HeroFact } from './HeroFacts'

interface EventOpenHeroProps {
  titleId: string
  eyebrow: string
  title: string
  promise: string
  facts: readonly HeroFact[]
  /** Status word when the event is not simply open ("Sold out", "Live now"); null for open. */
  statusLabel: string | null
  statusTone: 'success' | 'warning' | 'danger' | 'neutral' | 'copper'
  /** In-page anchor of the experience section. */
  detailsHref: string
  media: MediaRef | null
}

/**
 * Event hero summary, open mode (reference `.event-hero`, screen 03): eyebrow, h1, promise, the facts grid (when,
 * where, price, format) and the "What happens when I arrive?" anchor. Copy left, photo right from 960px; on phones the
 * photo comes first and the copy follows, then the page renders the decision panel directly below. Server Component.
 */
export function EventOpenHero({
  titleId,
  eyebrow,
  title,
  promise,
  facts,
  statusLabel,
  statusTone,
  detailsHref,
  media,
}: EventOpenHeroProps) {
  return (
    <section aria-labelledby={titleId} className="pt-6 pb-8 md:py-16">
      <Shell className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-16">
        <div className="order-2 min-w-0 md:order-1 md:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{eyebrow}</Eyebrow>
            {statusLabel === null ? null : <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>}
          </div>
          <Heading level={1} size="hero" id={titleId} className="mt-3 mb-4">
            {title}
          </Heading>
          {promise.trim() === '' ? null : <Text variant="lead">{promise}</Text>}
          <HeroFacts facts={facts} className="my-6" />
          <TextLink href={detailsHref as Route} icon={<ArrowRight size="sm" />}>
            What happens when I arrive?
          </TextLink>
        </div>
        <div className="order-1 min-w-0 md:order-2 md:col-span-7">
          <EventHeroMedia media={media} />
        </div>
      </Shell>
    </section>
  )
}
