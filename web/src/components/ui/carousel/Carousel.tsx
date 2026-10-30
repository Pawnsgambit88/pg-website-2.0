import { useId } from 'react'
import type { MediaCollection } from '@/lib/api/types/media'
import { cn } from '@/lib/cn'
import { MediaFrame } from '@/components/ui/media/MediaFrame'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { AspectRatio, ImageSlot } from '@/components/ui/media/sizes'
import { CarouselControlsLazy } from './CarouselControlsLazy'

// Carousel (TASK-033, ARCH-001 13/14/15). Server Component. Every slide is real HTML in a native CSS scroll-snap track,
// so the first slide is in the raw HTML (LCP, SEO), swiping works with no JavaScript, and the remaining images are
// lazy. The interactive layer (buttons, dots, autoplay, keyboard, slide inertness) is the client island
// CarouselControls, loaded as its own chunk and only when there are 2+ slides in carousel mode.

export interface CarouselProps {
  /** The CMS collection: mode, autoplay, interval and ordered items. */
  media: MediaCollection
  /** Accessible name of the region, e.g. "Photos from the last game night". Required. */
  label: string
  ratio?: AspectRatio
  slot?: ImageSlot
  sizes?: string
  /** Makes the FIRST slide the page LCP image (eager + fetchpriority). Other slides are always lazy. */
  priority?: boolean
  /** Text for the empty tile when the collection has no items. */
  emptyLabel?: string
  className?: string
}

export function Carousel({
  media,
  label,
  ratio = '4:3',
  slot,
  sizes,
  priority = false,
  emptyLabel,
  className,
}: CarouselProps) {
  const uid = useId()
  const { items, mode, autoplay, intervalMs } = media

  // 0 items: placeholder tile. 1 item, or mode "static": the first photo in a plain frame. No controls, no client JS.
  if (mode !== 'carousel' || items.length <= 1) {
    return (
      <MediaFrame
        media={items[0]}
        ratio={ratio}
        slot={slot}
        sizes={sizes}
        priority={priority}
        emptyLabel={emptyLabel}
        className={className}
      />
    )
  }

  const regionId = `carousel-${uid}`
  const trackId = `${regionId}-track`
  const count = items.length

  return (
    <div
      id={regionId}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('flex min-w-0 flex-col gap-3', className)}
    >
      <div className="overflow-hidden rounded-public border border-line">
        <ul
          id={trackId}
          // Focusable scroll area (WCAG 2.1.1, axe scrollable-region-focusable): arrows/Home/End are handled by the controller.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard reachable
          tabIndex={0}
          aria-label={`${label}, slides`}
          className="m-0 flex snap-x snap-mandatory list-none overflow-x-auto overscroll-x-contain p-0"
        >
          {items.map((item, i) => (
            <li
              key={`${item.src}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              data-carousel-slide=""
              className="w-full shrink-0 snap-center"
            >
              <ResponsiveImage
                {...item}
                ratio={ratio}
                slot={slot}
                sizes={sizes}
                // Only the first slide can be the LCP image. The rest stay lazy so they cost nothing up front.
                priority={priority && i === 0}
              />
            </li>
          ))}
        </ul>
      </div>
      {/* Reserved row: the controls mount after hydration without moving the page. */}
      <div className="min-h-11">
        <CarouselControlsLazy
          regionId={regionId}
          trackId={trackId}
          count={count}
          autoplay={autoplay}
          intervalMs={intervalMs}
        />
      </div>
    </div>
  )
}
