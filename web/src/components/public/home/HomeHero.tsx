import type { Route } from 'next'
import { Shell } from '@/components/layout/Shell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { HomeContentDto } from '@/lib/api/types/site-content'

// TODO: move to CMS hero.mediaTag. HomeContentDto has no field for the photo tag yet; one line per entry.
const HERO_MEDIA_TAG = ['Real boards', 'Real people'] as const

const TITLE_ID = 'home-hero-title'

// Box ratio per width: tall on phones (reference 48vh), wide while stacked (720-959), about 5:4 in the 7/12 column
// (reference min(54vh, 620px)). Complete literals for the Tailwind scanner. The base `aspect-4/5` comes from `ratio`.
const MEDIA_BOX = 'shadow-brand sm:aspect-3/2 md:aspect-5/4'

interface HomeHeroProps {
  content: HomeContentDto['hero']
}

/**
 * Home hero (screen 01, reference `approved-home-hero`). Server Component. The one h1 of the page, with the accent line
 * as a block span in Forest italic; lede, body, two CTAs and the proof list. The photo is the page's only `priority`
 * image and is never animated. Opening reveal is the CSS `hero-reveal` keyframe on the supporting copy only: the h1
 * and the image are never at opacity 0, so neither LCP candidate waits for an animation (DEC-029 point 2).
 */
export function HomeHero({ content }: HomeHeroProps) {
  const media = content.media.items[0]
  return (
    <section aria-labelledby={TITLE_ID} className="pt-8 pb-6 md:pt-12 md:pb-8">
      <Shell className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-16">
        <div className="min-w-0 md:col-span-5">
          <Eyebrow className="hero-reveal">{content.eyebrow}</Eyebrow>
          <Heading level={1} size="hero" id={TITLE_ID} className="mt-3 mb-4">
            {content.headlineLine1} <span className="block text-forest italic">{content.headlineAccent}</span>
          </Heading>
          <Text variant="lead" className="hero-reveal hero-reveal-delay-1">
            {content.lead}
          </Text>
          <Text className="hero-reveal hero-reveal-delay-2 mt-2 max-w-prose">{content.body}</Text>
          <div className="hero-reveal hero-reveal-delay-3 mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button
              href={content.primaryCta.href as Route}
              variant="copper"
              icon={<ArrowRight size="sm" />}
              iconPosition="end"
              className="grow xs:grow-0"
            >
              {content.primaryCta.label}
            </Button>
            <TextLink href={content.secondaryCta.href as Route} icon={<ArrowRight size="sm" />}>
              {content.secondaryCta.label}
            </TextLink>
          </div>
          {content.proofPoints.length === 0 ? null : (
            <ul className="hero-reveal hero-reveal-delay-4 mt-4 flex flex-wrap gap-x-3 gap-y-2 type-eyebrow text-forest">
              {content.proofPoints.map((point, index) => (
                <li key={`${index}-${point}`} className="flex items-center gap-3">
                  {index === 0 ? null : (
                    <span aria-hidden="true" className="text-copper-dark">
                      ·
                    </span>
                  )}
                  <span className="wrap-break-word">{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <figure className="relative min-w-0 md:col-span-7">
          {media === undefined ? (
            <div
              className={`aspect-4/5 w-full bg-linear-to-b from-sand to-paper-deep ${MEDIA_BOX}`}
              data-media-state="empty"
            />
          ) : (
            <ResponsiveImage {...media} slot="hero" ratio="4:5" priority className={MEDIA_BOX} />
          )}
          <span className="absolute right-0 bottom-0 bg-parchment px-3 py-2 font-mono text-eyebrow text-forest uppercase">
            {HERO_MEDIA_TAG.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
        </figure>
      </Shell>
    </section>
  )
}
