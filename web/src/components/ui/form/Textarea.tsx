'use client'

import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'
import { CONTROL_CLASS } from '@/components/ui/form/controlStyles'
import { joinIds, useFieldControl } from '@/components/ui/form/fieldContext'

export interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'cols'> {
  /** Forces `aria-invalid` when used without a `Field` that has an error. */
  invalid?: boolean
}

/**
 * Multi-line text (reference `textarea`). Same look as Input; vertical resize only, so it can never widen past a 320px
 * viewport. Reads id and descriptions from the surrounding `Field`. Uncontrolled by default.
 */
export function Textarea({ invalid, className, id, ref, rows = 4, ...rest }: TextareaProps) {
  const field = useFieldControl()
  const invalidState = invalid === true || field?.['aria-invalid'] === true || rest['aria-invalid'] === true
  return (
    <textarea
      {...rest}
      ref={ref}
      id={id ?? field?.id}
      rows={rows}
      aria-invalid={invalidState ? true : undefined}
      aria-describedby={joinIds(rest['aria-describedby'], field?.['aria-describedby'])}
      aria-required={rest['aria-required'] ?? field?.['aria-required'] ?? (rest.required ? true : undefined)}
      className={cn(CONTROL_CLASS, 'resize-y leading-snug', className)}
    />
  )
}
