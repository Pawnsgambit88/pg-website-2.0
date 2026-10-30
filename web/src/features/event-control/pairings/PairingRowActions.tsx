'use client'

import { resultActionFor } from '@/features/event-control/pairings/pairings-logic'
import { ResultAction } from '@/features/event-control/pairings/ResultAction'
import type { AdminPairingDto } from '@/lib/api/types/admin/control-rounds'

interface Props {
  eventId: string
  roundId: string
  row: AdminPairingDto
  onDone: () => void
}

/** The result button of one table row: enter, override or resolve, from the server's capabilities. */
export function PairingRowActions({ eventId, roundId, row, onDone }: Props) {
  if (row.kind === 'bye') return null
  const action = resultActionFor(row)
  if (action === null) return null
  return <ResultAction eventId={eventId} roundId={roundId} pairing={row} action={action} onDone={onDone} />
}
