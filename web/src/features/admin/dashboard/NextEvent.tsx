import type { Route } from 'next'
import { MetricTile } from '@/components/domain/MetricTile'
import { eventStatusLabel, eventStatusTone } from '@/components/domain/eventLabels'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import type { DashboardSummaryDto } from '@/lib/api/types/admin/dashboard'
import { formatEventDateTime } from '@/lib/format/date'

type DashboardEvent = NonNullable<DashboardSummaryDto['event']>

/** Next or today's event: title, date, status, link to its control room, and the two figures that matter on the day. */
export function NextEvent({ event }: { event: DashboardEvent }) {
  const places = event.capacity === null ? 'unlimited places' : `of ${event.capacity} places`
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Surface
        as="div"
        tone="admin"
        className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="font-display text-xl wrap-break-word">{event.title}</p>
          <p className="mt-1 text-sm text-muted">{formatEventDateTime(event.startsAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {event.status === 'draft' ? (
            <StatusBadge>Draft</StatusBadge>
          ) : (
            <StatusBadge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</StatusBadge>
          )}
          <Button href={`/admin/events/${encodeURIComponent(event.id)}` as Route} variant="secondary">
            Open control room
          </Button>
        </div>
      </Surface>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <MetricTile label="Confirmed" value={event.confirmed} hint={places} />
        <MetricTile label="First-timers" value={event.firstTimers} hint="Welcome them personally" />
      </div>
    </div>
  )
}
