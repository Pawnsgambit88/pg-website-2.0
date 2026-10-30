import { StatusBadge } from '@/components/ui/StatusBadge'
import type { TableColumn } from '@/components/ui/table/tableTypes'
import { RESULT_STATE_LABEL, resultText, resultTone } from '@/features/event-control/pairings/pairings-labels'
import type { AdminPairingDto, BoardPlayer } from '@/lib/api/types/admin/control-rounds'

function PlayerCell({ player }: { player: BoardPlayer }) {
  return (
    <span className="grid gap-0.5">
      <span>{player.name}</span>
      <span className="text-sm text-ink-soft">
        {player.rating === null ? 'Unrated' : `Rating ${String(player.rating)}`}
        {player.firstTimer ? ' · First-timer' : ''}
      </span>
    </span>
  )
}

export const PAIRING_COLUMNS: readonly TableColumn<AdminPairingDto>[] = [
  {
    id: 'board',
    header: 'Board',
    rowHeader: true,
    priority: 'primary',
    cell: (row) => `Board ${String(row.board)}`,
  },
  {
    id: 'white',
    header: 'White',
    priority: 'primary',
    cell: (row) => (row.kind === 'bye' ? <PlayerCell player={row.player} /> : <PlayerCell player={row.white} />),
  },
  {
    id: 'black',
    header: 'Black',
    priority: 'primary',
    cell: (row) => (row.kind === 'bye' ? 'Bye (sits out)' : <PlayerCell player={row.black} />),
  },
  {
    id: 'result',
    header: 'Result',
    priority: 'primary',
    cell: (row) => {
      if (row.kind === 'bye') return <StatusBadge tone="neutral">Bye</StatusBadge>
      const { result } = row
      return (
        <span className="grid justify-items-start gap-1">
          <StatusBadge tone={resultTone(result)}>{RESULT_STATE_LABEL[result.state]}</StatusBadge>
          <span className="text-sm">{resultText(result)}</span>
          {result.state === 'final' && result.decidedBy === 'admin' ? (
            <span className="text-sm text-ink-soft">
              Set by the host{result.adminReason === null ? '' : `: ${result.adminReason}`}
            </span>
          ) : null}
        </span>
      )
    },
  },
]
