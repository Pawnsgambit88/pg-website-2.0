import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ShellTag = 'div' | 'header' | 'footer' | 'section' | 'article' | 'aside'

interface ShellProps {
  /** Element to render. Landmarks (`header`, `footer`) are the caller's choice; the default adds no semantics. */
  as?: ShellTag
  /** Layout additions only (spacing, flex, grid). Colours and widths come from the variants. */
  className?: string
  children: ReactNode
}

/**
 * Content column: at most 1440px wide with a 20px (below 720px) or 36px (720px and up) gutter on each side. Uses the
 * `shell` utility from utilities.css, which reads the responsive `--gutter` set in base.css. Full-bleed backgrounds go
 * on the parent (see `Section`); the Shell itself stays transparent so it can sit on any surface.
 */
export function Shell({ as: Tag = 'div', className, children }: ShellProps) {
  return <Tag className={cn('shell', className)}>{children}</Tag>
}
