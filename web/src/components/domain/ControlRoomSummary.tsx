import { MetricTile } from '@/components/domain/MetricTile'
import type { StatusTone } from '@/components/ui/StatusBadge'

export interface ControlRoomMetric {
  id: string
  label: string
  value?: string | number | null
  hint?: string | null
  status?: { label: string; tone?: StatusTone }
}

interface ControlRoomSummaryProps {
  metrics: readonly ControlRoomMetric[]
  /** Accessible name of the group ("Event summary"). */
  label: string
  className?: string
}

/** Responsive group of MetricTiles: 1 column at 320, 2 from 480, 4 from 960. Server Component. */
export function ControlRoomSummary({ metrics, label, className }: ControlRoomSummaryProps) {
  return (
    <ul
      aria-label={label}
      className={`grid min-w-0 grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-4 ${className ?? ''}`.trim()}
    >
      {metrics.map((metric) => (
        <li key={metric.id} className="min-w-0">
          <MetricTile
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            status={metric.status}
            className="h-full"
          />
        </li>
      ))}
    </ul>
  )
}
