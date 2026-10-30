import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ActionRowProps {
  /** Alignment of the actions on the main axis. `end` pushes them right from `sm` up; they stay left-aligned below. */
  align?: 'start' | 'end'
  /** Stack full-width below `sm` (720px) so each button keeps a wide tap target on a phone. Default true. */
  stackOnMobile?: boolean
  className?: string
  children: ReactNode
}

/**
 * Row of buttons and links (reference `.action-row`: 8px gap, wraps). It lays out; it does not size the controls.
 * Wraps rather than scrolls, so six actions at 320px become several lines instead of a horizontal scroller.
 */
export function ActionRow({ align = 'start', stackOnMobile = true, className, children }: ActionRowProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 gap-2',
        stackOnMobile ? 'flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center' : 'flex-wrap items-center',
        align === 'end' && 'sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  )
}
