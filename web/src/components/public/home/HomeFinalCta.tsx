import type { Route } from 'next'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { HomeContentDto } from '@/lib/api/types/site-content'

interface HomeFinalCtaProps {
  content: HomeContentDto['finalCta']
}

const TITLE_ID = 'home-final-cta-title'

/**
 * Full-bleed closing band (reference `.final-photo-cta`): photo behind, copy and the copper button at the bottom.
 *
 * Scrim. The reference gradient (ink 82% at the bottom) is photo-dependent. Here the copy never sits on the bare photo:
 * a fixed 128px fade (forest-dark 0 to 90%) leads into a forest-dark 90% band that holds the copy. Worst case (pure
 * white photo pixels) that backing composites to about rgb 46 57 51, giving parchment heading 10.5:1 (large text needs 3), parchment-muted
 * body 6.0:1 and copper-soft eyebrow 4.9:1 (both need 4.5). The section is a dark surface (`surface-dark` plus
 * `data-surface="dark"`), so the eyebrow, focus ring and copper button switch to their on-dark tokens (copper-soft fill,
 * ink label, 7.40:1). This is the only copper button below the hero. If the photo is missing the forest fill remains.
 *
 * Box. The band is 4:5 below 720px (room for the copy over the photo) and 16:9 from 720px, and grows with its content,
 * so long copy never clips. The section itself must not clip (`overflow-hidden` on an aspect box drops its content-based
 * minimum height); only the absolute photo layer clips. Its inner element carries `data-motion="scale"` for the GSAP
 * island (transform only, CLS 0). Lazy, `banner` slot, `sizes="100vw"`. Server Component.
 */
export function HomeFinalCta({ content }: HomeFinalCtaProps) {
  const { eyebrow, headline, body, cta, media } = content
  const photo = media.items[0]

  return (
    <section
      aria-labelledby={TITLE_ID}
      data-surface="dark"
      className="surface-dark relative flex aspect-4/5 flex-col justify-end sm:aspect-16/9"
    >
      {photo === undefined ? null : (
        <div className="absolute inset-0 overflow-hidden">
          <div data-motion="scale" className="h-full w-full">
            <ResponsiveImage {...photo} slot="banner" ratio="16:9" sizes="100vw" className="h-full" />
          </div>
        </div>
      )}

      <div aria-hidden="true" className="relative h-32 bg-linear-to-t from-forest-dark/90 to-transparent" />
      <div className="relative bg-forest-dark/90 pb-16 sm:pb-24">
        <div className="shell">
          <div data-motion="reveal" className="flex max-w-2xl min-w-0 flex-col items-start gap-4">
            <Eyebrow>{eyebrow}</Eyebrow>
            <Heading level={2} id={TITLE_ID}>
              {headline}
            </Heading>
            <Text tone="on-dark" className="max-w-prose">
              {body}
            </Text>
            <Button
              href={cta.href as Route}
              variant="copper"
              icon={<ArrowRight size="sm" />}
              iconPosition="end"
              className="mt-2"
            >
              {cta.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
