'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form'
import type { ZodType } from 'zod'

/**
 * react-hook-form wired to a zod 4 schema. Defaults: validate on submit, then re-validate on change once a field has
 * been shown invalid (`reValidateMode: 'onChange'`), so the error clears as soon as it is fixed and typing in a valid
 * field triggers nothing. `shouldFocusError` stays on: an invalid submit focuses the first invalid control (every
 * `FormField` hands its ref to RHF). Define the schema at module scope so it is built once.
 *
 * Pass `form.control` to `FormField`. Do not call `form.watch()` at the form root (it re-renders the whole form); use
 * `useWatch({ control, name })` in the leaf that needs the value.
 */
export function useZodForm<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  schema: ZodType<TOutput, TInput>,
  options?: Omit<UseFormProps<TInput, unknown, TOutput>, 'resolver'>,
): UseFormReturn<TInput, unknown, TOutput> {
  return useForm<TInput, unknown, TOutput>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    ...options,
    resolver: zodResolver(schema),
  })
}
