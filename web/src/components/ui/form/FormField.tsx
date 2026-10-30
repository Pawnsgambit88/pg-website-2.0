'use client'

import { Controller, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from 'react-hook-form'
import type { ReactNode } from 'react'
import { Field } from '@/components/ui/form/Field'
import { controlIdFor } from '@/lib/forms/ids'

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>
  name: N
  label: ReactNode
  hint?: ReactNode
  required?: boolean
  optionalLabel?: boolean
  group?: boolean
  className?: string
  /**
   * Render the control. Pass `field.ref` as `ref` (so an invalid submit focuses it), plus `field.value`,
   * `field.onChange`, `field.onBlur` and `field.name`. `id` is the stable id the `FormErrorSummary` links to.
   */
  children: (field: ControllerRenderProps<T, N>, id: string) => ReactNode
}

/**
 * Bridges react-hook-form's `Controller` to `Field`: the error from form state becomes the adjacent error text, the
 * control gets `aria-invalid` / `aria-describedby` through `Field` context, and the stable id (`controlIdFor(name)`)
 * lets `FormErrorSummary` link to it. `Controller` subscribes to this field alone, so typing in one field does not
 * re-render its siblings. For plain Input/Textarea prefer `register` (uncontrolled) inside a `Field`; use FormField
 * for Select, Switch, ChoiceCard and anything value-driven.
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  hint,
  required,
  optionalLabel,
  group,
  className,
  children,
}: FormFieldProps<T, N>) {
  const id = controlIdFor(name)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          id={id}
          label={label}
          hint={hint}
          required={required}
          optionalLabel={optionalLabel}
          group={group}
          className={className}
          error={fieldState.error?.message}
        >
          {children(field, id)}
        </Field>
      )}
    />
  )
}
