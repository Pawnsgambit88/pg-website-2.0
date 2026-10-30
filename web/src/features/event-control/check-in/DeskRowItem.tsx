import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { DeskRow } from '@/lib/api/types/admin/control-checkin'

export function DeskRowItem({ row, onToggle }: { row: DeskRow; onToggle: (row: DeskRow) => void }) {
  const arrived = row.checkedInAt !== null
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lg font-strong wrap-break-word">{row.name}</span>
        <div className="flex flex-wrap gap-2">
          {arrived ? (
            <StatusBadge tone="success">{row.checkInSource === 'self' ? 'Arrived (self)' : 'Arrived'}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Waiting</StatusBadge>
          )}
          {row.firstTimer ? (
            <StatusBadge tone={row.welcomed ? 'neutral' : 'copper'}>
              {row.welcomed ? 'First-timer, welcomed' : 'First-timer'}
            </StatusBadge>
          ) : null}
        </div>
      </div>
      <Button
        size="lg"
        variant={arrived ? 'secondary' : 'primary'}
        className="min-w-28 shrink-0"
        aria-label={`${arrived ? 'Undo check-in for' : 'Check in'} ${row.name}`}
        onClick={() => {
          onToggle(row)
        }}
      >
        {arrived ? 'Undo' : 'Check in'}
      </Button>
    </li>
  )
}
