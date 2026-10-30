import { Banner } from '@/components/ui/feedback/Banner'
import type { EventCardDto } from '@/lib/api/types/event'
import { formatEventDate } from '@/lib/format/date'
import { NextEventLink } from './NextEventLink'
import { hasText } from './eventText'

interface CancelledNoticeProps {
  cancelled: { reason: string; cancelledAt: string } | null
  next: EventCardDto | null
}

/**
 * Clear cancelled notice: a danger banner with the host's reason and the date, then the next game. Static (not a live
 * region): it is the state of the page, not a change. No registration action. Server Component.
 */
export function CancelledNotice({ cancelled, next }: CancelledNoticeProps) {
  const when = cancelled === null ? null : formatEventDate(cancelled.cancelledAt)
  return (
    <div className="grid gap-4">
      <Banner tone="danger" title="This game has been cancelled.">
        {cancelled !== null && hasText(cancelled.reason) ? `${cancelled.reason} ` : ''}
        {when === null ? '' : `Cancelled on ${when}. `}
        If you registered, check your email for what happens next.
      </Banner>
      <NextEventLink next={next} />
    </div>
  )
}
