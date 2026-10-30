'use client'

import { useWatch, type Control } from 'react-hook-form'
import { FormField } from '@/components/ui/form/FormField'
import { Select } from '@/components/ui/form/Select'
import { useLockedField } from '@/features/event-builder/context'
import { RATING_POOLS, type RatingPool } from '@/lib/api/types/identity'
import type { PairingMode } from '@/lib/api/types/event-state'

/** Flat form shape of the game-system step: the read type is a union on `rated`, the form edits one object. */
export interface GameSystemValues {
  rated: boolean
  pool?: RatingPool
  pairingMode: PairingMode
  rounds: number | null
  timeControl: string
}

const POOL_LABELS: Readonly<Record<RatingPool, string>> = {
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
}
const POOL_OPTIONS = RATING_POOLS.map((value) => ({ value, label: POOL_LABELS[value] }))

/** Rating pool select, shown only while the event is rated. */
export function PoolField({ control }: { control: Control<GameSystemValues> }) {
  const rated = useWatch({ control, name: 'rated' })
  const pool = useLockedField('pool')
  if (!rated) return null
  return (
    <FormField
      control={control}
      name="pool"
      label="Rating pool"
      required
      hint={pool.locked ? `Locked: ${pool.reason}` : 'Which rating this event updates.'}
    >
      {(field, id) => (
        <Select
          id={id}
          ref={field.ref}
          name={field.name}
          value={field.value ?? ''}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          options={POOL_OPTIONS}
          disabled={pool.locked}
        />
      )}
    </FormField>
  )
}
