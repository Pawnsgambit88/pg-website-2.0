'use client'

import * as RadixSwitch from '@radix-ui/react-switch'
import { useId, type ReactNode, type Ref } from 'react'
import { Check } from '@/components/ui/icons/Check'
import { cn } from '@/lib/cn'
import { joinIds } from '@/components/ui/form/fieldContext'

export interface SwitchProps {
  /** Visible label, always rendered next to the switch and associated with it (`htmlFor`), so the whole row toggles. */
  label: ReactNode
  /** Supporting text under the label. Linked with `aria-describedby`. */
  description?: ReactNode
  /** Error text, adjacent and linked with `aria-describedby`; sets `aria-invalid`. */
  error?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  name?: string
  /** Value posted with a native form when on. Radix default is `on`. */
  value?: string
  id?: string
  disabled?: boolean
  required?: boolean
  onBlur?: () => void
  ref?: Ref<HTMLButtonElement>
  className?: string
}

/**
 * On/off setting (Radix Switch: `role="switch"`, `aria-checked`, Space/Enter, hidden input for native forms).
 * The row is at least 48px tall and the label is part of the hit area. State is shown by thumb position AND a tick
 * inside the thumb when on, never by colour alone. The thumb transition is removed by the global reduced-motion rule.
 */
export function Switch({
  label,
  description,
  error,
  checked,
  defaultChecked,
  onCheckedChange,
  name,
  value,
  id,
  disabled,
  required,
  onBlur,
  ref,
  className,
}: SwitchProps) {
  const generated = useId()
  const controlId = id ?? `switch-${generated.replace(/:/g, '')}`
  const descriptionId = `${controlId}-description`
  const errorId = `${controlId}-error`
  const hasDescription = description !== undefined && description !== null && description !== false
  const hasError = error !== undefined && error !== null && error !== false && error !== ''

  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <div className="flex min-h-control min-w-0 items-center gap-3">
        <RadixSwitch.Root
          ref={ref}
          id={controlId}
          name={name}
          value={value}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          required={required}
          onBlur={onBlur}
          aria-describedby={joinIds(hasDescription && descriptionId, errorId)}
          aria-invalid={hasError ? true : undefined}
          className="group tap relative inline-flex h-8 w-12 shrink-0 cursor-pointer items-center rounded-full border border-muted bg-sand p-1 transition-colors duration-control hover:border-ink disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-2 aria-invalid:border-danger data-[state=checked]:border-forest data-[state=checked]:bg-forest"
        >
          <RadixSwitch.Thumb className="flex size-5 items-center justify-center rounded-full bg-parchment-soft text-forest shadow-brand transition-transform duration-control data-[state=checked]:translate-x-4">
            <span className="hidden group-data-[state=checked]:inline-flex" aria-hidden="true">
              <Check size="sm" />
            </span>
          </RadixSwitch.Thumb>
        </RadixSwitch.Root>
        <label
          htmlFor={controlId}
          className={cn(
            'min-w-0 text-body font-semibold wrap-break-word text-ink',
            disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      </div>
      {hasDescription ? (
        <p id={descriptionId} className="min-w-0 text-sm wrap-break-word text-muted">
          {description}
        </p>
      ) : null}
      <div id={errorId} aria-live="polite" className="min-w-0 empty:hidden">
        {hasError ? <p className="text-sm font-semibold wrap-break-word text-danger-ink">{error}</p> : null}
      </div>
    </div>
  )
}
