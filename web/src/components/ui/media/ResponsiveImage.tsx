'use client'

import Image from 'next/image'
import { useEffect, useId, useState } from 'react'
import type { MediaRef } from '@/lib/api/types/media'
import { focalToObjectPosition } from './focal'
import { isRenderableMediaSrc } from './mediaPolicy'
import { DEFAULT_BLUR_DATA_URL, placeholderFor } from './placeholders'
import { trackPriorityImage } from './priorityGuard'
import { ASPECT_CLASS, nearestAspectRatio, SLOT_PRESETS, type AspectRatio, type ImageSlot } from './sizes'

// ResponsiveImage (TASK-032, ARCH-001 13.3). A fixed aspect-ratio box around `next/image` with `fill`, so the space is
// reserved before the file arrives (no layout shift). Client component only because of the `onError` fallback and the
// dev-time priority guard; the <img> itself is in the server HTML.

export interface ImageOptions {
  /** Layout slot: picks the `sizes` string and the default ratio (see sizes.ts). */
  slot?: ImageSlot
  /** Overrides the slot ratio. Without a slot or ratio the box follows the image's own width/height. */
  ratio?: AspectRatio
  /** Overrides the slot `sizes`. Use only when the layout differs from every preset. */
  sizes?: string
  /**
   * Eager load with a preload hint and `fetchpriority=high`. For the single LCP image of a page ONLY. A second live
   * priority image logs an error in development and in tests (priorityGuard.ts).
   */
  priority?: boolean
  /** Classes for the aspect box (not the <img>). */
  className?: string
}

/**
 * Props come straight from a `MediaRef` (`<ResponsiveImage {...media} slot="card" />`). The union makes `alt` required
 * unless `decorative: true`, so a missing alt is a type error; an empty alt without `decorative` also throws below.
 */
export type ResponsiveImageProps = MediaRef & ImageOptions

const DEFAULT_SIZES = '100vw'

export function ResponsiveImage(props: ResponsiveImageProps) {
  const {
    src,
    width,
    height,
    focal,
    blurDataUrl,
    decorative,
    alt,
    slot,
    ratio,
    sizes,
    priority = false,
    className,
  } = props
  const guardId = useId()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!priority) return undefined
    return trackPriorityImage(guardId)
  }, [priority, guardId])

  if (!decorative && alt.trim() === '' && process.env.NODE_ENV !== 'production') {
    throw new Error(
      `ResponsiveImage: "${src}" has no alt text. Provide alt, or mark the image decorative (decorative: true, alt: '').`,
    )
  }

  const boxRatio = ratio ?? (slot === undefined ? undefined : SLOT_PRESETS[slot].ratio)
  const placeholderRatio = boxRatio ?? nearestAspectRatio(width, height)
  const allowed = isRenderableMediaSrc(src)
  const failed = failedSrc === src
  const useFallback = !allowed || failed
  const state = !allowed ? 'blocked' : failed ? 'fallback' : 'ok'

  return (
    <div
      className={`relative w-full overflow-hidden ${boxRatio === undefined ? '' : ASPECT_CLASS[boxRatio]} ${className ?? ''}`.trim()}
      style={boxRatio === undefined ? { aspectRatio: `${width} / ${height}` } : undefined}
      data-ratio={boxRatio ?? 'natural'}
      data-media-state={state}
    >
      <Image
        src={useFallback ? placeholderFor(placeholderRatio) : src}
        alt={decorative ? '' : alt}
        fill
        sizes={sizes ?? (slot === undefined ? DEFAULT_SIZES : SLOT_PRESETS[slot].sizes)}
        className="object-cover"
        style={{ objectPosition: focalToObjectPosition(focal) }}
        placeholder={useFallback ? 'empty' : 'blur'}
        blurDataURL={useFallback ? undefined : (blurDataUrl ?? DEFAULT_BLUR_DATA_URL)}
        preload={priority}
        fetchPriority={priority ? 'high' : undefined}
        onError={useFallback ? undefined : () => setFailedSrc(src)}
      />
    </div>
  )
}
