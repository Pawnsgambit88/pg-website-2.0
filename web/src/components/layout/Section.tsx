import type { ReactNode } from 'react'
import { Shell } from '@/components/layout/Shell'
import { cn } from '@/lib/cn'

/**
 * Surface behind a section.
 *  parchment       page background (default)
 *  parchment-soft  slightly lighter panel band
 *  sand            warm band; muted text fails AA on sand (4.17), use ink or ink-soft there
 *  forest          dark band (`surface-dark`: forest, parchment text, copper-soft focus ring)
 */
export type SectionTone = 'parchment' | 'parchment-soft' | 'sand' | 'forest'

/** Vertical rhythm. `default` 64px then 96px from 720px; `compact` 48px then 64px; `flush` 32px on top only. */
export type SectionSpace = 'default' | 'compact' | 'flush'

const TONE_CLASS: Record<SectionTone, string> = {
  parchment: 'bg-parchment text-ink',
  'parchment-soft': 'bg-parchment-soft text-ink',
  sand: 'bg-sand text-ink',
  forest: 'surface-dark',
}

const SPACE_CLASS: Record<SectionSpace, string> = {
  default: 'py-16 sm:py-24',
  compact: 'py-12 sm:py-16',
  flush: 'pt-8 pb-16 sm:pb-24',
}

interface SectionProps {
  /** `section` needs an accessible name (`aria-labelledby` pointing at its heading), otherwise use `div`. */
  as?: 'section' | 'div' | 'aside'
  tone?: SectionTone
  space?: SectionSpace
  /** Wrap children in `Shell` (max 1440, 20/36 gutters). Set false only for a full-bleed child such as a hero image. */
  contained?: boolean
  id?: string
  'aria-labelledby'?: string
  'aria-label'?: string
  /** Layout additions for the outer band (for example `border-t border-line`). */
  className?: string
  children: ReactNode
}

/** Full-bleed page band with a tone and a vertical rhythm. Server Component. */
export function Section({
  as: Tag = 'section',
  tone = 'parchment',
  space = 'default',
  contained = true,
  id,
  className,
  children,
  ...aria
}: SectionProps) {
  return (
    <Tag
      id={id}
      data-surface={tone === 'forest' ? 'dark' : undefined}
      className={cn(TONE_CLASS[tone], SPACE_CLASS[space], className)}
      {...aria}
    >
      {contained ? <Shell>{children}</Shell> : children}
    </Tag>
  )
}
