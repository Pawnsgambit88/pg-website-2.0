import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface InfoStackProps {
  className?: string
  /** `InfoRow` children. */
  children: ReactNode
}

/**
 * Label and value list (reference `.info-stack`) as a real description list, so a screen reader announces each pair.
 * Rows are separated by a hairline; the last row is closed by `InfoRow` itself.
 */
export function InfoStack({ className, children }: InfoStackProps) {
  return <dl className={cn('grid min-w-0 border-b border-line', className)}>{children}</dl>
}
