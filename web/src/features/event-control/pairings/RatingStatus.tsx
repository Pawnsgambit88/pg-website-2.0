import { Banner } from '@/components/ui/feedback/Banner'
import type { AdminRoundDto } from '@/lib/api/types/admin/control-rounds'
import { formatEventDateTime } from '@/lib/format/date'

/** Rating processing of a finalised round (C12 `ratingProcessing`). */
export function RatingStatus({ round }: { round: Extract<AdminRoundDto, { state: 'completed' }> }) {
  const status = round.ratingProcessing
  const finalised = formatEventDateTime(round.finalisedAt)
  if (status.status === 'not_rated') {
    return (
      <Banner tone="info" title="Not a rated event">
        Finalised {finalised}. No ratings were changed.
      </Banner>
    )
  }
  if (status.status === 'pending') {
    return (
      <Banner tone="warning" title="Ratings are being processed">
        Finalised {finalised}. Ratings are queued and appear on player profiles shortly. This page checks again every
        few seconds.
      </Banner>
    )
  }
  return (
    <Banner tone="success" title="Ratings processed">
      Finalised {finalised}. Ratings were processed {formatEventDateTime(status.processedAt)}.
    </Banner>
  )
}
