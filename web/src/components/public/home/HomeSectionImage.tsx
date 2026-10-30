import { MediaFrame } from '@/components/ui/media/MediaFrame'
import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { AspectRatio } from '@/components/ui/media/sizes'
import type { MediaRef } from '@/lib/api/types/media'
import { cn } from '@/lib/cn'

interface HomeSectionImageProps {
  /** First item of the section's media collection; `undefined` (0 items) renders the empty tile at the same ratio. */
  media: MediaRef | undefined
  ratio: AspectRatio
  /**
   * Marks the inner element `data-motion="scale"` for the Home GSAP island (DEC-029, plan A1.2). The outer box clips
   * (`overflow-hidden`) and keeps its size, so the transform never shifts layout (CLS 0).
   */
  scale?: boolean
  /** Marks the frame itself `data-motion="reveal"` (section reveal). */
  reveal?: boolean
  /** Layout additions for the frame (width caps, alignment). */
  className?: string
}

/**
 * Editorial half-width photo for the lower Home sections: square-cornered 2px frame with a hairline (light hairline on a
 * dark surface), lazy loaded (never `priority`), `split` sizes. Server Component; only ResponsiveImage is a client leaf.
 */
export function HomeSectionImage({ media, ratio, scale = false, reveal = false, className }: HomeSectionImageProps) {
  const motion = reveal ? 'reveal' : undefined

  if (media === undefined) {
    return (
      <div data-motion={motion} className={cn('w-full', className)}>
        <MediaFrame media={null} ratio={ratio} />
      </div>
    )
  }

  return (
    <div
      data-motion={motion}
      className={cn(
        'w-full overflow-hidden rounded-public border border-line in-data-[surface=dark]:border-line-light',
        className,
      )}
    >
      <div data-motion={scale ? 'scale' : undefined}>
        <ResponsiveImage {...media} slot="split" ratio={ratio} />
      </div>
    </div>
  )
}
