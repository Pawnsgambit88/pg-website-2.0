'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { ChoiceCard } from '@/components/ui/form/ChoiceCard'
import { Field } from '@/components/ui/form/Field'
import { Textarea } from '@/components/ui/form/Textarea'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { ErrorLine } from '@/features/player/event-room/ErrorLine'
import {
  disabledReason,
  MY_OUTCOME_LABEL,
  MY_OUTCOME_SENTENCE,
  MY_OUTCOMES,
  submitterWord,
  toMyOutcome,
  toWireOutcome,
  type LiveRoom,
  type MyOutcome,
} from '@/features/player/event-room/room-state'
import type { useEventRoomActions } from '@/features/player/event-room/useEventRoomActions'

type Actions = ReturnType<typeof useEventRoomActions>

/**
 * The result flow of the player's own game (M07 to M09), driven only by `result` and `capabilities`:
 *   none            -> radio group (I won / Draw / I lost), then a ConfirmDialog, then submit
 *   submitted (me)  -> "waiting for your opponent", with Raise an issue when allowed
 *   awaiting (opp.) -> Confirm result / Raise an issue
 *   disputed        -> the host is reviewing
 *   final           -> the outcome in words
 * A disabled action keeps its reason as visible text (AC-84). Nothing is optimistic: the panel changes after the
 * server answered and the snapshot was refetched.
 */
export function ResultActions({ room, actions }: { room: LiveRoom; actions: Actions }) {
  const pairing = room.pairing
  const { submitResult, confirmResult, disputeResult } = actions
  const [choice, setChoice] = useState<MyOutcome | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [note, setNote] = useState('')
  if (pairing === null) return null
  const result = room.result

  const closeSubmit = () => {
    setConfirmSubmit(false)
  }
  const submit = () => {
    if (choice === null) return
    submitResult.mutate(
      { pairingId: pairing.pairingId, outcome: toWireOutcome(choice, pairing.colour) },
      // the dialog closes on success; on failure it stays closed and the error shows below (the choice is kept)
    )
    closeSubmit()
  }
  const dispute = () => {
    const trimmed = note.trim()
    disputeResult.mutate({ pairingId: pairing.pairingId, ...(trimmed === '' ? {} : { note: trimmed }) })
    setDisputing(false)
  }

  const disputeButton = room.capabilities.canDispute ? (
    <Button variant="secondary" onClick={() => setDisputing(true)}>
      Raise an issue
    </Button>
  ) : null

  let body
  switch (result.state) {
    case 'none': {
      const reason = disabledReason(room, 'canSubmitResult')
      const can = room.capabilities.canSubmitResult
      body = (
        <div className="flex flex-col gap-3">
          <Field group label="How did your game end?">
            <div className="grid gap-3 xs:grid-cols-3">
              {MY_OUTCOMES.map((option) => (
                <ChoiceCard
                  key={option}
                  type="radio"
                  name="my-result"
                  value={option}
                  label={MY_OUTCOME_LABEL[option]}
                  disabled={!can}
                  checked={choice === option}
                  onCheckedChange={(checked) => {
                    if (checked) setChoice(option)
                  }}
                />
              ))}
            </div>
          </Field>
          <Button
            variant="copper"
            fullWidth
            disabled={!can || choice === null}
            loading={submitResult.isPending}
            loadingLabel="Sending result"
            aria-describedby="result-hint"
            onClick={() => setConfirmSubmit(true)}
          >
            Submit result
          </Button>
          <Text variant="small" id="result-hint">
            {can
              ? choice === null
                ? 'Choose how your game ended, then submit. Your opponent will confirm it.'
                : 'You will be asked to check it before it is sent.'
              : (reason ?? 'You cannot submit a result right now.')}
          </Text>
          <ErrorLine error={submitResult.error} action="send your result" />
        </div>
      )
      break
    }
    case 'submitted':
      body = (
        <div className="flex flex-col gap-3">
          <Text>
            Result sent by {submitterWord(result.submittedBy)}. Waiting for{' '}
            {result.submittedBy === 'me' ? 'your opponent' : 'the other player'} to confirm.
          </Text>
          {disputeButton}
        </div>
      )
      break
    case 'awaiting_confirmation': {
      const reason = disabledReason(room, 'canConfirmResult')
      body = (
        <div className="flex flex-col gap-3">
          <Text>
            {submitterWord(result.submittedBy) === 'you' ? 'You' : 'Your opponent'} sent a result for this game. Check
            it against your board: confirm if it is right, or raise an issue if not.
          </Text>
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Button
              variant="copper"
              disabled={!room.capabilities.canConfirmResult}
              loading={confirmResult.isPending}
              loadingLabel="Confirming"
              aria-describedby={reason === null ? undefined : 'confirm-hint'}
              onClick={() => confirmResult.mutate({ pairingId: pairing.pairingId })}
            >
              Confirm result
            </Button>
            {disputeButton}
          </div>
          {reason === null ? null : (
            <Text variant="small" id="confirm-hint">
              {reason}
            </Text>
          )}
          <ErrorLine error={confirmResult.error} action="confirm the result" />
        </div>
      )
      break
    }
    case 'disputed':
      body = (
        <Text>
          An issue was raised on this game. The host is reviewing it and will settle the result. You do not need to do
          anything else.
        </Text>
      )
      break
    case 'final':
      body = (
        <Text tone="inherit" className="font-strong">
          Final result: {MY_OUTCOME_SENTENCE[toMyOutcome(result.outcome, pairing.colour)]}.
        </Text>
      )
      break
  }

  return (
    <div className="flex flex-col gap-3">
      {body}
      <ErrorLine error={disputeResult.error} action="raise an issue" />
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        onConfirm={submit}
        title="Send this result?"
        consequence={
          choice === null
            ? 'Choose a result first.'
            : `You are reporting: ${MY_OUTCOME_SENTENCE[choice]}. Your opponent will be asked to confirm it.`
        }
        confirmLabel="Send result"
        cancelLabel="Go back"
      />
      <ConfirmDialog
        open={disputing}
        onOpenChange={setDisputing}
        onConfirm={dispute}
        title="Raise an issue with this game?"
        consequence="The host will look at this game and settle the result. Add a short note if it helps."
        confirmLabel="Raise issue"
        cancelLabel="Go back"
      >
        <Field label="Note for the host" optionalLabel>
          <Textarea value={note} maxLength={500} rows={3} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
