import type { ReactNode } from 'react'
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import { NO_VALUE } from '@/lib/format/placeholder'

interface MetricTileProps {
  /** What is measured ("Registered", "Checked in"). */
  label: string
  /** The figure, already formatted (`formatInr`, counts). Missing values show "—". */
  value?: ReactNode
  /** Short context under the figure ("of 24 places"). */
  hint?: string | null
  /** Text status next to the label; the words carry the meaning, the tone only reinforces it. */
  status?: { label: string; tone?: StatusTone }
  className?: string
}

/** Single operational figure for the Control Room summary and admin dashboard (admin surface). Server Component. */
export function MetricTile({ label, value, hint, status, className }: MetricTileProps) {
  const empty = value === undefined || value === null || value === ''
  return (
    <Surface as="div" tone="admin" className={className}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="type-eyebrow text-muted">{label}</p>
        {status === undefined ? null : <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      </div>
      <p className="mt-2 font-display text-3xl leading-none wrap-break-word">{empty ? NO_VALUE : value}</p>
      {hint === null || hint === undefined || hint === '' ? null : <p className="mt-2 text-sm text-muted">{hint}</p>}
    </Surface>
  )
}
