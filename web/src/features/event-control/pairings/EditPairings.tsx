'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { SaveBar } from '@/components/admin/SaveBar'
import { conflictFromLastChange, isVersionConflict, type ConflictInfo } from '@/components/admin/versionConflict'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/feedback/Banner'
import { useToast } from '@/components/ui/feedback/useToast'
import { Field } from '@/components/ui/form/Field'
import { Textarea } from '@/components/ui/form/Textarea'
import { PlayerSeat } from '@/features/event-control/pairings/PlayerSeat'
import {
  buildEditInput,
  editPhase,
  flipColours,
  isMovable,
  modelFromRound,
  sameModel,
  swapPlayers,
  type DraftModel,
} from '@/features/event-control/pairings/pairings-logic'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import type { AdminRoundDto, BoardPlayer, EditPairingsInput } from '@/lib/api/types/admin/control-rounds'
import { useLiveAnnouncer } from '@/lib/hooks/useLiveAnnouncer'
import { cn } from '@/lib/cn'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'

interface Props {
  eventId: string
  round: AdminRoundDto
  onExit: () => void
}

function playersOf(round: AdminRoundDto): ReadonlyMap<string, BoardPlayer> {
  const map = new Map<string, BoardPlayer>()
  for (const pairing of round.pairings) {
    if (pairing.kind === 'bye') map.set(pairing.player.registrationId, pairing.player)
    else {
      map.set(pairing.white.registrationId, pairing.white)
      map.set(pairing.black.registrationId, pairing.black)
    }
  }
  return map
}

/**
 * Pairings editor (C08). Drag is replaced by select-to-swap, which works with a keyboard, a screen reader and a thumb:
 * press one player, then another, and they trade seats (boards, colours or the bye). "Swap colours" flips a board.
 * A draft saves without a reason; once published or live every change creates a new round version, needs a reason and
 * is audited. Boards that already have a result are locked. A VERSION_CONFLICT keeps the local edits on screen, re-reads
 * the round and offers to load the other version.
 */
export function EditPairings({ eventId, round, onExit }: Props) {
  const api = useApi().admin
  const queryClient = useQueryClient()
  const toast = useToast()
  const announce = useLiveAnnouncer()
  const players = useMemo(() => playersOf(round), [round])

  // The edit is based on this version. It is NOT updated by background refetches: a stale base must conflict.
  const [base, setBase] = useState(() => ({ version: round.version, model: modelFromRound(round) }))
  const [model, setModel] = useState<DraftModel>(base.model)
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(false)
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const [failure, setFailure] = useState<ReturnType<typeof copyFor> | null>(null)

  const phase = editPhase(round)
  const dirty = !sameModel(model, base.model)

  const mutation = useApiMutation<AdminRoundDto, EditPairingsInput>({
    idempotent: false,
    mutationFn: (input) => api.control.editPairings(eventId, round.id, input),
    invalidates: () => [qk.admin.rounds(eventId), qk.admin.overview(eventId)],
    onSuccess: () => {
      toast.success(phase === 'draft' ? 'Draft pairings saved' : 'Pairings updated and players notified')
      onExit()
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        setConflict(conflictFromLastChange(null))
        void queryClient.invalidateQueries({ queryKey: qk.admin.rounds(eventId) })
        return
      }
      setFailure(copyFor(error, { action: 'save these pairings' }))
    },
  })

  const pick = (registrationId: string): void => {
    if (selected === null) {
      setSelected(registrationId)
      announce(`${players.get(registrationId)?.name ?? 'Player'} selected. Choose who to swap with.`)
      return
    }
    if (selected === registrationId) {
      setSelected(null)
      return
    }
    setModel((current) => swapPlayers(current, selected, registrationId))
    announce(`Swapped ${players.get(selected)?.name ?? 'player'} and ${players.get(registrationId)?.name ?? 'player'}.`)
    setSelected(null)
  }

  const flip = (boardNo: number): void => {
    setModel((current) => flipColours(current, boardNo))
    announce(`Board ${String(boardNo)}: colours swapped.`)
  }

  const save = (): void => {
    setFailure(null)
    const request = buildEditInput(model, round, base.version, reason)
    if (!request.ok) {
      setReasonError(true)
      return
    }
    setReasonError(false)
    mutation.mutate(request.input)
  }

  const reload = (): void => {
    const fresh = modelFromRound(round)
    setBase({ version: round.version, model: fresh })
    setModel(fresh)
    setSelected(null)
    setConflict(null)
    setFailure(null)
    mutation.reset()
  }

  const discard = (): void => {
    setModel(base.model)
    setSelected(null)
    setFailure(null)
  }

  return (
    <section aria-label="Edit pairings" className="flex min-w-0 flex-col gap-4">
      <Banner tone="info" title="Select two players to swap them">
        Press a player, then another player, to trade their seats. Use &ldquo;Swap colours&rdquo; to flip a board.
        {phase === 'after_publish'
          ? ' This round is already published, so a change creates a new version, notifies players and needs a reason.'
          : ' This is still a draft: players cannot see it.'}
      </Banner>

      <ol className="grid list-none gap-3 p-0 sm:grid-cols-2">
        {model.boards.map((board) => {
          const white = players.get(board.white)
          const black = players.get(board.black)
          if (white === undefined || black === undefined) return null
          return (
            <li
              key={board.board}
              className="rounded-md flex flex-col gap-2 border border-line-admin bg-admin-panel p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-ui text-base font-strong">Board {board.board}</h3>
                {board.locked ? <span className="text-sm text-ink-soft">Locked: has a result</span> : null}
              </div>
              <PlayerSeat
                player={white}
                label={`Board ${String(board.board)} white`}
                selected={selected === board.white}
                movable={isMovable(model, board.white)}
                onPick={pick}
              />
              <PlayerSeat
                player={black}
                label={`Board ${String(board.board)} black`}
                selected={selected === board.black}
                movable={isMovable(model, board.black)}
                onPick={pick}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={board.locked}
                onClick={() => {
                  flip(board.board)
                }}
              >
                Swap colours<span className="sr-only"> on board {board.board}</span>
              </Button>
            </li>
          )
        })}
      </ol>

      <div className={cn('flex flex-col gap-2', model.byes.length === 0 && 'hidden')}>
        <h3 className="font-ui text-base font-strong">Byes (sitting out this round)</h3>
        <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
          {model.byes.map((registrationId) => {
            const player = players.get(registrationId)
            if (player === undefined) return null
            return (
              <li key={registrationId}>
                <PlayerSeat
                  player={player}
                  label="Bye"
                  selected={selected === registrationId}
                  movable={isMovable(model, registrationId)}
                  onPick={pick}
                />
              </li>
            )
          })}
        </ul>
      </div>

      {phase === 'after_publish' ? (
        <Field
          label="Reason for the change"
          required
          hint="Up to 500 characters. Kept in the audit log."
          error={reasonError ? 'Give a reason for this change.' : undefined}
        >
          <Textarea
            value={reason}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value)
              setReasonError(false)
            }}
          />
        </Field>
      ) : null}

      {failure === null ? null : (
        <Banner tone="danger" title={failure.title} live="alert">
          {failure.body}
        </Banner>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={dirty || mutation.isPending} onClick={onExit}>
          Close editor
        </Button>
        {dirty ? <p className="self-center text-sm text-ink-soft">Save or discard your changes to close.</p> : null}
      </div>

      <SaveBar
        dirty={dirty}
        saving={mutation.isPending}
        onSave={save}
        onDiscard={discard}
        conflict={conflict}
        onReloadLatest={reload}
      />
    </section>
  )
}
