import { ResponsiveImage } from '@/components/ui/media/ResponsiveImage'
import { isRenderableMediaSrc } from '@/components/ui/media/mediaPolicy'
import type { MediaRef } from '@/lib/api/types/media'
import { cn } from '@/lib/cn'

/**
 * Diameter. The reference uses 34 / 44 / 88px; those are not on the 4px spacing scale, so the nearest scale steps are
 * used: 32, 48 and 96px. 96px also equals the `avatar` slot in media/sizes.ts, so the optimiser serves exactly the
 * right width.
 */
export type AvatarSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-24 text-xl',
}

interface AvatarProps {
  /** The person's name. Required: it gives the initials and the accessible name. */
  name: string
  /**
   * Photo as the API returns it (`MediaRef`: src, size, focal point, alt). Rendered through ResponsiveImage, so the
   * source is checked against the media allow-list and only same-origin or configured-host images load; nothing is
   * hotlinked. Without a photo, or when its source is not allowed, the initials are shown.
   */
  photo?: MediaRef | undefined
  size?: AvatarSize
  /**
   * True when the name is already visible next to the avatar (table row, profile header): the avatar is then hidden from
   * assistive technology instead of announcing the name twice. Default false: the avatar is an image named after the
   * person.
   */
  decorative?: boolean
  /** Layout additions only (margin, flex behaviour). */
  className?: string
}

/** Up to two initials: first letter of the first and last words (code points, so "Øystein" and emoji-free names work). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (first === undefined) return '?'
  const last = words.length > 1 ? words[words.length - 1] : undefined
  const letter = (word: string) => Array.from(word)[0] ?? ''
  return `${letter(first)}${last === undefined ? '' : letter(last)}`.toLocaleUpperCase('en-IN')
}

/**
 * Round person picture with an initials fallback (reference `.avatar`: forest disc, parchment Fragment Mono initials,
 * 11.74:1). Photo alt text: the `alt` from the API when present, else the person's name. Server Component; the photo is
 * the ResponsiveImage client island, so the initials-only case ships no client JS.
 * Limit: if a permitted photo fails to load, ResponsiveImage swaps in its neutral placeholder tile, not the initials.
 */
export function Avatar({ name: rawName, photo, size = 'md', decorative = false, className }: AvatarProps) {
  const name = rawName.trim() === '' ? 'Player' : rawName
  const showPhoto = photo !== undefined && isRenderableMediaSrc(photo.src)
  const frame = cn(
    'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-forest font-mono tracking-tight text-parchment select-none',
    SIZE_CLASS[size],
    className,
  )

  if (showPhoto) {
    const alt = decorative ? '' : photo.alt.trim() === '' ? name : photo.alt
    const media: MediaRef = decorative ? { ...photo, decorative: true, alt: '' } : { ...photo, decorative: false, alt }
    return (
      <span className={frame}>
        <ResponsiveImage {...media} slot="avatar" ratio="1:1" />
      </span>
    )
  }

  return decorative ? (
    <span aria-hidden="true" className={frame}>
      {initialsOf(name)}
    </span>
  ) : (
    <span role="img" aria-label={name} className={frame}>
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  )
}
