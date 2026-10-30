import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { HeadingLevel } from '@/components/ui/headingLevel'

/**
 * Visual size, independent of the semantic level.
 *  hero        text-hero (3.4rem to 7.5rem), public hero h1
 *  section     text-section (2.4rem to 5rem), public section h2
 *  page-intro  text-page-intro (2.2rem to 4.2rem), signed-in and admin page h1
 *  panel       3xl editorial heading for panels and work areas
 *  card        xl UI-font heading for cards and list items
 */
export type HeadingSize = 'hero' | 'section' | 'page-intro' | 'panel' | 'card'

const SIZE_CLASS: Record<HeadingSize, string> = {
  hero: 'font-display text-hero',
  section: 'font-display text-section',
  'page-intro': 'font-display text-page-intro',
  panel: 'font-display text-3xl leading-none font-medium tracking-tight',
  card: 'font-ui text-xl leading-tight font-strong tracking-tight',
}

interface HeadingProps {
  /** Semantic level (h1 to h6). Required: never derived from the size. One h1 per page. */
  level: HeadingLevel
  /** Visual size. Defaults to a size that suits the level (1 page-intro, 2 section, 3 panel, 4 to 6 card). */
  size?: HeadingSize
  id?: string
  /** Layout additions only (margin, max width). */
  className?: string
  children: ReactNode
}

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: 'page-intro',
  2: 'section',
  3: 'panel',
  4: 'card',
  5: 'card',
  6: 'card',
}

/**
 * Heading with the level and the look chosen separately, so the document outline stays correct while the design asks
 * for a smaller h2 or a larger h3. Long words wrap (`wrap-break-word`) so nothing overflows at 320px.
 */
export function Heading({ level, size, id, className, children }: HeadingProps) {
  const Tag = `h${level}` as const
  return (
    <Tag id={id} className={cn(SIZE_CLASS[size ?? DEFAULT_SIZE[level]], 'wrap-break-word', className)}>
      {children}
    </Tag>
  )
}
