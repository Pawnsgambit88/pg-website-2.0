import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

interface StoryImageBlockProps {
  block: Extract<ContentBlock, { type: 'image' }>
}

// The body column is the prose measure (about 65ch, under 720px wide); full width below the shell gutters on phones.
const BODY_IMAGE_SIZES = '(min-width:720px) 720px, 100vw'

/**
 * Inline photo at its natural ratio with an optional caption. Always lazy: the cover is the page's only priority image.
 * Alt comes from the media ref (required unless decorative).
 */
export function StoryImageBlock({ block }: StoryImageBlockProps) {
  return (
    <figure className="my-4 overflow-hidden rounded-public border border-line">
      <ResponsiveImage {...block.media} sizes={BODY_IMAGE_SIZES} />
      {block.caption === undefined ? null : (
        <figcaption className="border-t border-line bg-parchment-soft px-3 py-2 text-label wrap-break-word text-muted">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}
