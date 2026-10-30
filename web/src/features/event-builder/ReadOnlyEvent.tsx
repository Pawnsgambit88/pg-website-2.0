'use client'

import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from '@/components/domain/eventStatusLabels'
import { Banner } from '@/components/ui/feedback/Banner'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReviewSummary } from '@/features/event-builder/review/ReviewSummary'
import type { BuilderDraftDto } from '@/lib/api/types/admin/event-builder'

/** Completed and cancelled events are history: a read-only recap instead of editable steps (m10). */
export function ReadOnlyEvent({ title, status }: { title: string; status: BuilderDraftDto['status'] }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 py-6">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Event builder</Eyebrow>
          <Heading level={1} size="panel" className="wrap-break-word">
            {title.trim() === '' ? 'Event' : title.trim()}
          </Heading>
        </div>
        <StatusBadge tone={EVENT_STATUS_TONE[status]}>{EVENT_STATUS_LABEL[status]}</StatusBadge>
      </header>
      <Banner
        tone="info"
        title={`This event is ${EVENT_STATUS_LABEL[status].toLowerCase()} and can no longer be edited.`}
      >
        Here is what it looked like at the end.
      </Banner>
      <ReviewSummary readOnly />
      <div>
        <Button href="/admin/events" variant="secondary">
          Back to events
        </Button>
      </div>
    </div>
  )
}
