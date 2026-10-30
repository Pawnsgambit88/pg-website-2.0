import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Vertical gap on the 4px scale: xs 8px, sm 12px, md 16px, lg 24px, xl 32px, 2xl 48px. */
export type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const GAP_CLASS: Record<StackGap, string> = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
}

interface StackProps {
  as?: 'div' | 'ul' | 'ol' | 'section' | 'article'
  gap?: StackGap
  className?: string
  children: ReactNode
}

/** Vertical flow with a fixed gap (replaces ad-hoc margins between siblings). For `ul`/`ol`, children must be `li`. */
export function Stack({ as: Tag = 'div', gap = 'md', className, children }: StackProps) {
  return <Tag className={cn('flex min-w-0 flex-col', GAP_CLASS[gap], className)}>{children}</Tag>
}
