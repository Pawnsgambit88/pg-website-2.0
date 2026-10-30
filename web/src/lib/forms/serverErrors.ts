import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { fieldErrorsFrom } from '@/lib/api/error-copy'

/**
 * Puts the per-field messages of an `ApiError` (`error.fields`, 422 validation) onto the matching form fields, so the
 * server text appears adjacent to the input, not in a toast. Only names listed in `knownFields` are applied; the rest
 * are returned as `unmatched` so the caller can show them in the form-level summary (nothing is silently dropped).
 * The first message per field is shown (`fieldErrorsFrom` already clips and bounds them). `applied[0]` is the field to
 * pass to `setFocus`.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): { applied: Path<T>[]; unmatched: Record<string, string[]> } {
  const fields = fieldErrorsFrom(error)
  const applied: Path<T>[] = []
  const unmatched: Record<string, string[]> = {}
  const known = new Set<string>(knownFields)
  for (const [name, messages] of Object.entries(fields)) {
    const message = messages[0]
    if (known.has(name) && message !== undefined) {
      setError(name as Path<T>, { type: 'server', message })
      applied.push(name as Path<T>)
    } else {
      unmatched[name] = messages
    }
  }
  return { applied, unmatched }
}
