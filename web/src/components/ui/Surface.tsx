import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Panel fill.
 *  paper   parchment-soft with a hairline (public and player panels)
 *  admin   admin-panel with the admin hairline (operations screens)
 *  forest  dark panel (`surface-dark`); text and focus ring switch to the dark variants
 */
export type SurfaceTone = 'paper' | 'admin' | 'forest'

const TONE_CLASS: Record<SurfaceTone, string> = {
  paper: 'bg-parchment-soft text-ink border border-line',
  admin: 'bg-admin-panel text-ink border border-line-admin',
  forest: 'surface-dark border border-forest',
}

/** Padding: `md` 16px then 24px from `sm`; `lg` 24px then 32px; `none` for panels that hold a full-bleed child. */
export type SurfacePadding = 'none' | 'md' | 'lg'

const PADDING_CLASS: Record<SurfacePadding, string> = {
  none: '',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
}

interface SurfaceProps {
  as?: 'div' | 'section' | 'article' | 'aside'
  tone?: SurfaceTone
  padding?: SurfacePadding
  id?: string
  'aria-labelledby'?: string
  'aria-label'?: string
  className?: string
  children: ReactNode
}

/** Bordered panel on 0px radius (public rule: 2px max; the reference surface is square). Server Component. */
export function Surface({
  as: Tag = 'div',
  tone = 'paper',
  padding = 'md',
  id,
  className,
  children,
  ...aria
}: SurfaceProps) {
  return (
    <Tag
      id={id}
      data-surface={tone === 'forest' ? 'dark' : undefined}
      className={cn('min-w-0', TONE_CLASS[tone], PADDING_CLASS[padding], className)}
      {...aria}
    >
      {children}
    </Tag>
  )
}
