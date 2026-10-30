import { useMemo } from 'react'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Text } from '@/components/ui/Text'
import { CountTile } from '@/features/event-control/check-in/CountTile'
import { DeskRowItem } from '@/features/event-control/check-in/DeskRowItem'
import type { CheckInDeskDto, DeskRow } from '@/lib/api/types/admin/control-checkin'
import { cn } from '@/lib/cn'

export function DeskList({
  data,
  needle,
  onToggle,
  stale,
}: {
  data: CheckInDeskDto
  needle: string
  onToggle: (row: DeskRow) => void
  stale: boolean
}) {
  // Instant: filter the rows already loaded while the debounced server search catches up.
  const rows = useMemo(
    () => (needle === '' ? data.rows.items : data.rows.items.filter((row) => row.name.toLowerCase().includes(needle))),
    [data.rows.items, needle],
  )
  const { counts, rows: page } = data
  return (
    <div className={cn('flex flex-col gap-4', stale && 'opacity-70')}>
      <div className="grid grid-cols-3 gap-2" aria-live="polite">
        <CountTile label="Expected" value={counts.expected} />
        <CountTile label="Arrived" value={counts.arrived} />
        <CountTile label="First-timers waiting" value={counts.firstTimersWaiting} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={needle === '' ? 'Nobody here yet' : 'No match'} headingLevel={2}>
          {needle === ''
            ? 'No players match this view.'
            : 'No player with that name in this view. Check the spelling or switch to Everyone.'}
        </EmptyState>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((row) => (
            <DeskRowItem key={row.registrationId} row={row} onToggle={onToggle} />
          ))}
        </ul>
      )}
      {page.pagination.total > page.items.length ? (
        <Text variant="small">
          Showing {page.items.length} of {page.pagination.total}. Search by name to find the rest.
        </Text>
      ) : null}
    </div>
  )
}
