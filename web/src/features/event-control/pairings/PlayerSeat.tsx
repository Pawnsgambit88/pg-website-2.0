'use client'

import { Button } from '@/components/ui/Button'
import type { BoardPlayer } from '@/lib/api/types/admin/control-rounds'

interface Props {
  player: BoardPlayer
  /** Spoken context ("Board 3 white"). */
  label: string
  selected: boolean
  movable: boolean
  onPick: (registrationId: string) => void
}

/** One player in the pairings editor: a real button, so it works with a keyboard, a screen reader and touch. */
export function PlayerSeat({ player, label, selected, movable, onPick }: Props) {
  return (
    <Button
      variant={selected ? 'primary' : 'secondary'}
      size="md"
      className="w-full justify-start text-left"
      disabled={!movable}
      onClick={() => {
        onPick(player.registrationId)
      }}
    >
      <span className="sr-only">{label}: </span>
      {selected ? <span className="sr-only">(selected) </span> : null}
      <span className="min-w-0 wrap-break-word">
        {player.name}
        <span className="text-sm opacity-80"> ({player.rating ?? 'unrated'})</span>
      </span>
    </Button>
  )
}
