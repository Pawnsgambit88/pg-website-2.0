'use client'

import { useId, useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { FieldContext, joinIds, type FieldControlProps } from '@/components/ui/form/fieldContext'

interface FieldProps {
  /** Visible label. Always rendered; a placeholder is never a label (UI-SPECIFICATION Fields). */
  label: ReactNode
  /** Control id. Defaults to a generated id. `FormField` passes a stable id so `FormErrorSummary` can link to it. */
  id?: string
  /** Supporting text below the control (format, why we ask). Linked with `aria-describedby`. */
  hint?: ReactNode
  /** Error text. Rendered adjacent, below the control, linked with `aria-describedby`; the control gets `aria-invalid`. */
  error?: ReactNode
  /** Marks the field required: the text "(required)" plus `aria-required` on the control (never colour alone). */
  required?: boolean
  /** Shows "(optional)" after the label, for forms where most fields are required. */
  optionalLabel?: boolean
  /**
   * Group mode: renders a `<fieldset>` with a `<legend>` instead of a label. Use for radio / checkbox card sets, where
   * the legend names the set and each option names itself.
   */
  group?: boolean
  /** Layout additions only (margin, grid span). */
  className?: string
  children: ReactNode
}

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== ''
}

/**
 * Label + control + hint + error, wired for assistive technology (ARCH-001 15, UI-SPECIFICATION Fields).
 * The control (Input, Textarea, Select, Switch) reads its `id`, `aria-describedby`, `aria-invalid` and `aria-required`
 * from context, so callers never pair ids by hand.
 *
 * The error sits in a persistent polite live region: it is announced when it appears on blur or submit, and the control
 * points at it with `aria-describedby` so it is read again on focus. `min-w-0` and `wrap-break-word` keep long labels
 * and messages inside a 320px viewport.
 */
export function Field({
  label,
  id,
  hint,
  error,
  required = false,
  optionalLabel = false,
  group = false,
  className,
  children,
}: FieldProps) {
  const generated = useId()
  const controlId = id ?? `field-${generated.replace(/:/g, '')}`
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const hasHint = present(hint)
  const hasError = present(error)
  const describedBy = joinIds(hasHint && hintId, errorId)

  const context = useMemo<FieldControlProps | null>(
    () =>
      group
        ? null
        : {
            id: controlId,
            'aria-describedby': describedBy,
            'aria-invalid': hasError ? true : undefined,
            'aria-required': required ? true : undefined,
          },
    [group, controlId, describedBy, hasError, required],
  )

  const labelContent = (
    <>
      {label}
      {required ? <span className="ml-1 font-normal text-ink-soft">(required)</span> : null}
      {!required && optionalLabel ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
    </>
  )
  const labelClass = 'block min-w-0 text-sm font-semibold text-ink-soft wrap-break-word'

  const body = (
    <>
      {children}
      {hasHint ? (
        <p id={hintId} className="min-w-0 text-sm wrap-break-word text-muted">
          {hint}
        </p>
      ) : null}
      <div id={errorId} aria-live="polite" className="min-w-0 empty:hidden">
        {hasError ? <p className="text-sm font-semibold wrap-break-word text-danger-ink">{error}</p> : null}
      </div>
    </>
  )

  return (
    <FieldContext value={context}>
      {group ? (
        <fieldset aria-describedby={describedBy} className={cn('grid min-w-0 gap-2 border-0 p-0', className)}>
          <legend className={cn(labelClass, 'mb-2 p-0')}>{labelContent}</legend>
          {body}
        </fieldset>
      ) : (
        <div className={cn('grid min-w-0 gap-2', className)}>
          <label htmlFor={controlId} className={labelClass}>
            {labelContent}
          </label>
          {body}
        </div>
      )}
    </FieldContext>
  )
}
