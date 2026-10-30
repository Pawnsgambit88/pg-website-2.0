'use client'

import { useState, type ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'
import { CONTROL_CLASS } from '@/components/ui/form/controlStyles'
import { joinIds, useFieldControl } from '@/components/ui/form/fieldContext'
import { INPUT_PRESETS, type InputPreset } from '@/lib/forms/presets'

export type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'search'

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  type?: InputType
  /** `inputMode` + `autoComplete` (+ type) bundle, see lib/forms/presets. Explicit props win. */
  preset?: InputPreset
  /** Forces `aria-invalid` when used without a `Field` that has an error. */
  invalid?: boolean
}

/**
 * Text input (reference `input`). 48px high, 17px text (16px minimum so iOS Safari does not zoom), field fill, focus ring.
 * Inside a `Field` it takes its id and descriptions from context. `type="password"` gets a show/hide button with an
 * accessible name that follows the state ("Show password" / "Hide password", visible text is contained in it) (44px target, keyboard reachable).
 * Uncontrolled by default (`register` or `defaultValue`), so typing re-renders nothing above it.
 */
export function Input({ type, preset, invalid, className, id, ref, ...rest }: InputProps) {
  const field = useFieldControl()
  const presetValue = preset ? INPUT_PRESETS[preset] : undefined
  const resolvedType: InputType = type ?? presetValue?.type ?? 'text'
  const [revealed, setRevealed] = useState(false)
  const isPassword = resolvedType === 'password'

  const controlId = id ?? field?.id
  const invalidState = invalid === true || field?.['aria-invalid'] === true || rest['aria-invalid'] === true
  const describedBy = joinIds(rest['aria-describedby'], field?.['aria-describedby'])
  const required = rest['aria-required'] ?? field?.['aria-required'] ?? (rest.required ? true : undefined)

  const input = (
    <input
      {...rest}
      ref={ref}
      id={controlId}
      type={isPassword && revealed ? 'text' : resolvedType}
      inputMode={rest.inputMode ?? presetValue?.inputMode}
      autoComplete={rest.autoComplete ?? presetValue?.autoComplete}
      autoCapitalize={rest.autoCapitalize ?? presetValue?.autoCapitalize}
      spellCheck={rest.spellCheck ?? presetValue?.spellCheck}
      aria-invalid={invalidState ? true : undefined}
      aria-describedby={describedBy}
      aria-required={required}
      className={cn(CONTROL_CLASS, isPassword && 'pr-16', !isPassword && className)}
    />
  )

  if (!isPassword) return input
  return (
    <div className={cn('relative min-w-0', className)}>
      {input}
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-controls={controlId}
        disabled={rest.disabled}
        className="absolute inset-y-0 right-0 min-w-tap rounded-public px-3 type-button text-forest hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
