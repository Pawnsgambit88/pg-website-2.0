'use client'

import {
  AVAILABILITY_CHECKING,
  AVAILABILITY_FAILED,
  hintAvailabilityText,
  liveAvailabilityText,
} from '@/components/public/events/availabilityText'
import { useAvailability } from '@/components/public/events/useAvailability'
import { cn } from '@/lib/cn'

interface AvailabilityBadgeProps {
  /** Event slug; an invalid slug never polls and keeps the fallback text. */
  slug: string
  /** Coarse prerendered hint (`EventSummaryDto.placesLeftHint`), shown until the first live value arrives. */
  hint?: number | null
  /** Default true. Pass false for events that cannot change (completed, cancelled): the hint stays, nothing polls. */
  live?: boolean
  className?: string
}

/**
 * Availability island (TASK-123; ARCH-001 7.3 rule 4, 9.6): places left, waitlist or sold out as text. The server HTML
 * shows the prerendered hint (or a neutral "checking" line); after hydration `useAvailability` polls every 30 s and the
 * text is replaced in place. The box reserves one line (`min-h-6`, no wrap below the line height) so the swap never
 * shifts layout. Not a live region: polls are not announced (ARCH-001 15, AC-90); the text is read on focus or browse.
 * A failed poll keeps the last value; only a failure with nothing to show prints the failure line. The registration
 * link elsewhere on the page keeps working regardless.
 */
export function AvailabilityBadge({ slug, hint, live = true, className }: AvailabilityBadgeProps) {
  const { data, status } = useAvailability(slug, { enabled: live })
  const fallback = hintAvailabilityText(hint)

  let text: string
  if (data !== undefined) text = liveAvailabilityText(data)
  else if (status === 'error' && fallback === null) text = AVAILABILITY_FAILED
  else text = fallback ?? AVAILABILITY_CHECKING

  return (
    <span
      data-availability={data === undefined ? 'pending' : data.state}
      className={cn('inline-flex min-h-6 min-w-0 items-center text-sm text-muted', className)}
    >
      {text}
    </span>
  )
}
