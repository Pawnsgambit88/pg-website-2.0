import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Column count from the `sm` breakpoint (720px) up. Below 720px every grid is one column, so nothing can overflow at
 * 320 or 390. Uneven splits (the reference 1.3fr/0.7fr) use `columns={3}` with `md:col-span-2` on the wide child.
 *
 * The class strings are complete literals on purpose: Tailwind finds classes by scanning source text.
 */
export type GridColumns = 1 | 2 | 3 | 4

const COLUMN_CLASS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

/** Gap on the 4px scale: 2 is 8px, 4 is 16px, 6 is 24px, 8 is 32px. Larger gap from `sm`. */
export type GridGap = 'sm' | 'md' | 'lg'

const GAP_CLASS: Record<GridGap, string> = {
  sm: 'gap-2',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
}

interface GridProps {
  as?: 'div' | 'ul' | 'ol'
  columns?: GridColumns
  gap?: GridGap
  className?: string
  children: ReactNode
}

/**
 * Responsive CSS grid. Children have `min-width: 0` so long words and wide content shrink instead of widening the
 * track. For `ul`/`ol`, children must be `li`.
 */
export function Grid({ as: Tag = 'div', columns = 1, gap = 'md', className, children }: GridProps) {
  return <Tag className={cn('grid *:min-w-0', COLUMN_CLASS[columns], GAP_CLASS[gap], className)}>{children}</Tag>
}
