'use client'

import * as RadixSelect from '@radix-ui/react-select'
import type { Ref } from 'react'
import { Check } from '@/components/ui/icons/Check'
import { ChevronDown } from '@/components/ui/icons/ChevronDown'
import { cn } from '@/lib/cn'
import { CONTROL_CLASS } from '@/components/ui/form/controlStyles'
import { joinIds, useFieldControl } from '@/components/ui/form/fieldContext'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: readonly SelectOption[]
  /** Controlled value; `''` means nothing chosen (the placeholder shows). */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shown while nothing is chosen. The visible `Field` label still names the control. */
  placeholder?: string
  /** Form field name: Radix renders a hidden native select so the value posts with a plain `<form>`. */
  name?: string
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  onBlur?: () => void
  /** Ref to the trigger button (react-hook-form `field.ref` focuses it for the error summary). */
  ref?: Ref<HTMLButtonElement>
  className?: string
  'aria-describedby'?: string
  'aria-label'?: string
}

/**
 * Single choice from a list (Radix Select, custom listbox styled with tokens). The trigger is a 48px button with the
 * control look; the list opens in a portal with keyboard type-ahead, arrow keys, Escape and focus return handled by
 * Radix. Options are 48px tall (44px minimum target). Inside a `Field` it takes its id, `aria-describedby`,
 * `aria-invalid` and `aria-required` from context, so the visible label focuses and names the trigger.
 * The selected option shows a check icon as well as the highlight (state is not colour alone).
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Choose an option',
  name,
  id,
  disabled,
  required,
  invalid,
  onBlur,
  ref,
  className,
  'aria-describedby': describedByProp,
  'aria-label': ariaLabel,
}: SelectProps) {
  const field = useFieldControl()
  const invalidState = invalid === true || field?.['aria-invalid'] === true
  const isRequired = required === true || field?.['aria-required'] === true

  return (
    <RadixSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
      required={required}
    >
      <RadixSelect.Trigger
        ref={ref}
        id={id ?? field?.id}
        aria-label={ariaLabel}
        aria-describedby={joinIds(describedByProp, field?.['aria-describedby'])}
        aria-invalid={invalidState ? true : undefined}
        aria-required={isRequired ? true : undefined}
        onBlur={onBlur}
        className={cn(CONTROL_CLASS, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <span className="min-w-0 flex-1 truncate data-placeholder:text-muted">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon className="shrink-0 text-forest">
          <ChevronDown size="md" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="z-overlay max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-0 overflow-hidden rounded-public border border-muted bg-parchment-soft text-ink shadow-brand"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="flex min-h-control cursor-pointer items-center gap-2 rounded-public px-3 py-2 text-body select-none data-disabled:cursor-not-allowed data-disabled:text-muted data-highlighted:bg-sand data-highlighted:outline-none data-[state=checked]:font-semibold"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto shrink-0 text-forest">
                  <Check size="md" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
