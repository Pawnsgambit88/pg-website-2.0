import { MetricTile } from '@/components/domain/MetricTile'
import type { EventOverviewDto } from '@/lib/api/types/admin/control-overview'

/** Summary strip (screen 46): 2x2 on mobile, one row from `md`. Counts come from the server; nothing is derived. */
export function SummaryStrip({ summary }: { summary: EventOverviewDto['summary'] }) {
  return (
    <section aria-label="Event summary" className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
      <MetricTile
        label="Confirmed"
        value={summary.confirmed}
        hint={summary.capacity === null ? 'unlimited places' : `of ${summary.capacity} places`}
      />
      <MetricTile label="Waitlist" value={summary.waitlist} />
      <MetricTile label="First-timers" value={summary.firstTimers} />
      <MetricTile label="Checked in" value={summary.checkedIn} hint={`of ${summary.confirmed} confirmed`} />
    </section>
  )
}
