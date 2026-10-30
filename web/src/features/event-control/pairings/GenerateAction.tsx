'use client'

import { useState } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/feedback/useToast'
import { Field } from '@/components/ui/form/Field'
import { Select } from '@/components/ui/form/Select'
import { GENERATE_METHODS, METHOD_LABEL } from '@/features/event-control/pairings/pairings-labels'
import type { GeneratePlan } from '@/features/event-control/pairings/pairings-logic'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { AdminRoundDto } from '@/lib/api/types/admin/control-rounds'
import type { PairingMode } from '@/lib/api/types/event-state'

interface Props {
  eventId: string
  plan: GeneratePlan
  defaultMethod: PairingMode
  onGenerated: (round: AdminRoundDto) => void
}

const METHOD_OPTIONS = GENERATE_METHODS.map((value) => ({ value, label: METHOD_LABEL[value] }))

function isMethod(value: string): value is PairingMode {
  return GENERATE_METHODS.some((method) => method === value)
}

/** Generates (or regenerates) the draft round (C07). The draft is invisible to players until it is published. */
export function GenerateAction({ eventId, plan, defaultMethod, onGenerated }: Props) {
  const api = useApi().admin
  const toast = useToast()
  const [method, setMethod] = useState<PairingMode>(defaultMethod)
  if (plan.roundNo === null) return null
  const roundNo = plan.roundNo
  const label = `${plan.regenerates ? 'Regenerate' : 'Generate'} round ${String(roundNo)}`
  return (
    <ConfirmAction
      renderTrigger={(open) => <Button onClick={open}>{label}</Button>}
      title={`${label}?`}
      consequence={
        plan.regenerates
          ? 'This replaces the draft pairings, including any edits. Nothing is published, so players see no change.'
          : 'This creates a draft: players cannot see it until you publish it. Checked-in players are paired; if nobody has checked in, all registered players are.'
      }
      confirmLabel={plan.regenerates ? 'Regenerate draft' : 'Generate draft'}
      destructive={plan.regenerates}
      actionLabel="generate these pairings"
      onConfirm={async (key) => {
        const created = await api.control.generateRound(eventId, { roundNo, method }, { idempotencyKey: key })
        onGenerated(created)
      }}
      onDone={() => {
        toast.success(`Round ${String(roundNo)} draft ready`)
      }}
    >
      <div className="mt-4">
        <Field label="Pairing method">
          <Select
            value={method}
            onValueChange={(value) => {
              if (isMethod(value)) setMethod(value)
            }}
            options={METHOD_OPTIONS}
          />
        </Field>
      </div>
    </ConfirmAction>
  )
}
