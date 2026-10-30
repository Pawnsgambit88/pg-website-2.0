import type { ReactNode } from 'react'
import type { MediaRef } from '@/lib/api/types/media'
import { ResponsiveImage, type ImageOptions } from './ResponsiveImage'
import { ASPECT_CLASS, type AspectRatio } from './sizes'

// MediaFrame (TASK-032, UI-SPECIFICATION photography): the bordered, 2px-radius editorial frame around one photo, with an
// optional mono tag overlay and caption. Server Component. With no media (a 0-asset collection) it renders the sand to
// paper-deep `media-frame--empty` tile at the same ratio, so the layout does not move when photos are added.

export interface MediaFrameProps extends Omit<ImageOptions, 'ratio'> {
  /** The photo, or nothing for the empty tile. Ratio variants: 1:1, 4:3, 3:2, 16:9, 4:5. */
  media?: MediaRef | null
  ratio?: AspectRatio
  /** Short overlay label such as a date or category. Plain text or inline elements only. */
  tag?: ReactNode
  /** Renders the frame as a <figure> with a <figcaption>. */
  caption?: ReactNode
  /** Text shown inside the empty tile. Omit for a purely visual tile. */
  emptyLabel?: string
}

export function MediaFrame({
  media,
  ratio = '4:3',
  slot,
  sizes,
  priority,
  className,
  tag,
  caption,
  emptyLabel,
}: MediaFrameProps) {
  const frameClass = `relative overflow-hidden rounded-public border border-line ${className ?? ''}`.trim()
  const tagOverlay =
    tag === undefined || tag === null ? null : (
      <span className="absolute top-3 left-3 rounded-public bg-parchment-soft px-2 py-1 font-mono text-eyebrow text-ink uppercase">
        {tag}
      </span>
    )

  const body =
    media === undefined || media === null ? (
      <div
        className={`media-frame--empty flex w-full items-center justify-center bg-linear-to-b from-sand to-paper-deep ${ASPECT_CLASS[ratio]}`}
        data-ratio={ratio}
        data-media-state="empty"
      >
        {emptyLabel === undefined ? null : <span className="font-mono text-label text-muted">{emptyLabel}</span>}
      </div>
    ) : (
      <ResponsiveImage {...media} ratio={ratio} slot={slot} sizes={sizes} priority={priority} />
    )

  if (caption !== undefined && caption !== null) {
    return (
      <figure className={frameClass}>
        {body}
        {tagOverlay}
        <figcaption className="border-t border-line bg-parchment-soft px-3 py-2 text-label text-muted">
          {caption}
        </figcaption>
      </figure>
    )
  }
  return (
    <div className={frameClass}>
      {body}
      {tagOverlay}
    </div>
  )
}
