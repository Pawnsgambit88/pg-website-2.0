import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EyebrowProps {
  as?: 'p' | 'span' | 'div'
  id?: string
  className?: string
  children: ReactNode
}

/**
 * Small mono label above a heading: 0.72rem, uppercase, 0.12em tracking (`type-eyebrow`, utilities.css).
 * Colour is copper-dark (5.56 on parchment, 4.78 on sand). Inside a dark surface (`data-surface="dark"`, set by
 * `Section tone="forest"` and `Surface tone="forest"`) it switches to copper-soft (5.50 on forest) with no prop.
 */
export function Eyebrow({ as: Tag = 'p', id, className, children }: EyebrowProps) {
  return (
    <Tag id={id} className={cn('type-eyebrow text-copper-dark in-data-[surface=dark]:text-copper-soft', className)}>
      {children}
    </Tag>
  )
}
