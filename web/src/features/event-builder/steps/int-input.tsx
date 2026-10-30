'use client'

import { Input } from '@/components/ui/form/Input'
import type { ControlProps } from '@/features/event-builder/steps/registration-inputs'

export function IntInput({
  value,
  onChange,
  onBlur,
  name,
  ref,
  disabled,
  placeholder,
}: ControlProps<number | null> & { disabled?: boolean; placeholder?: string }) {
  return (
    <Input
      ref={ref}
      name={name}
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(event) => {
        const raw = event.target.value
        onChange(raw === '' ? null : Number(raw))
      }}
      onBlur={onBlur}
    />
  )
}
