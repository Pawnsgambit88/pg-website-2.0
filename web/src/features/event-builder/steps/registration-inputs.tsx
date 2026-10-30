'use client'

import type { Ref } from 'react'
import { CONTROL_CLASS } from '@/components/ui/form/controlStyles'
import { useFieldControl } from '@/components/ui/form/fieldContext'
import { parseInstant, toIstParts } from '@/lib/format/instant'

const pad = (n: number): string => String(n).padStart(2, '0')

/** ISO instant to the `datetime-local` value on the IST wall clock. */
function toLocalInput(iso: string | null): string {
  if (iso === null) return ''
  const ms = parseInstant(iso)
  if (ms === null) return ''
  const p = toIstParts(ms)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** `datetime-local` value (IST) to an ISO instant with an explicit offset. */
function fromLocalInput(value: string): string | null {
  return value === '' ? null : `${value}:00+05:30`
}

export interface ControlProps<V> {
  value: V
  onChange: (next: V) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
}

export function IstDateTimeInput({ value, onChange, onBlur, name, ref }: ControlProps<string | null>) {
  const field = useFieldControl()
  return (
    <input
      ref={ref}
      name={name}
      id={field?.id}
      type="datetime-local"
      aria-describedby={field?.['aria-describedby']}
      aria-invalid={field?.['aria-invalid']}
      className={CONTROL_CLASS}
      value={toLocalInput(value)}
      onChange={(event) => onChange(fromLocalInput(event.target.value))}
      onBlur={onBlur}
    />
  )
}
