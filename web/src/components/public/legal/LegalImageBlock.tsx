import { MediaFrame } from '@/components/ui/media/MediaFrame'
import { nearestAspectRatio } from '@/components/ui/media/sizes'
import type { ContentBlock } from '@/lib/api/types/content-blocks'

/** Article column width at 960px and up (`max-w-3xl`), 100vw below. */
const ARTICLE_SIZES = '(min-width:961px) 768px, 100vw'

/**
 * Image inside the legal text (rare: a diagram). Bordered editorial frame at the nearest supported ratio, lazy loaded
 * (never `priority`), optional caption as text. Alt text and the decorative flag come from the MediaRef.
 */
export function LegalImageBlock({ block }: { block: Extract<ContentBlock, { type: 'image' }> }) {
  const { media, caption } = block
  return (
    <div className="my-8 max-w-prose">
      <MediaFrame
        media={media}
        ratio={nearestAspectRatio(media.width, media.height)}
        sizes={ARTICLE_SIZES}
        caption={caption}
      />
    </div>
  )
}
