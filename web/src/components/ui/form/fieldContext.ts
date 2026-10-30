'use client'

import { createContext, useContext } from 'react'

/** What a control inherits from its surrounding `Field`: the id the label points at and the descriptions to announce. */
export interface FieldControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

export const FieldContext = createContext<FieldControlProps | null>(null)

/** Props to spread on a control; empty when the control is used outside a `Field` (it then needs its own label). */
export function useFieldControl(): FieldControlProps | null {
  return useContext(FieldContext)
}

/** Joins description ids, skipping empty parts. */
export function joinIds(...ids: (string | undefined | false)[]): string | undefined {
  const out = ids.filter((id): id is string => typeof id === 'string' && id !== '').join(' ')
  return out === '' ? undefined : out
}
