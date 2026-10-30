'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodType } from 'zod'
import { formFieldName, overlayStep } from '@/features/event-builder/patch'
import { STEP_FORM_SCHEMAS } from '@/features/event-builder/step-schemas'
import type { BuilderState, BuilderStore } from '@/features/event-builder/store'
import type { StepDataKey } from '@/features/event-builder/types'
import type { LockableField } from '@/lib/api/types/admin/event-builder'

// React bindings of the builder store. Hooks here are the ONLY way step components touch builder state:
//   useStepForm(key)           per-step React Hook Form wired to the store (defaults, diff -> autosave, validation)
//   useLockedField(field)      locked-fields rule: { locked, reason } from the server's `lockedFields`
//   useBuilderSelector(select) subscribe to a primitive slice of the state (never the whole draft)
//   useBuilderNav()            go to another step (issue deep links)

const StoreContext = createContext<BuilderStore | null>(null)

export function BuilderProvider({ store, children }: { store: BuilderStore; children: ReactNode }) {
  return <StoreContext value={store}>{children}</StoreContext>
}

export function useBuilderStore(): BuilderStore {
  const store = useContext(StoreContext)
  if (store === null) throw new Error('useBuilderStore must be used inside <BuilderProvider>')
  return store
}

/**
 * Subscribes to one derived slice. The selector MUST return a stable value for unchanged state (a primitive, or a
 * reference that lives in the state such as `s.server`); a selector that builds a new object each call loops forever.
 * The component re-renders only when the selected value changes.
 */
export function useBuilderSelector<T>(selector: (state: BuilderState) => T): T {
  const store = useBuilderStore()
  const getSnapshot = (): T => selector(store.getState())
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

/** Locked-fields rule (FEAT-001 OQ-07, AC-84): render the control `disabled` with `reason` as visible hint text. */
export function useLockedField(field: LockableField): { locked: boolean; reason: string | undefined } {
  const reason = useBuilderSelector((state) =>
    state.server.lockedFields.includes(field)
      ? (state.server.lockedReasons[field] ?? 'This cannot be changed now.')
      : null,
  )
  return useMemo(() => ({ locked: reason !== null, reason: reason ?? undefined }), [reason])
}

// ---------- Per-step form ----------

export interface StepFormOptions {
  /** Override the form schema when the form shape differs from the stored read shape (for example a plain-string slug). */
  schema?: ZodType
}

/**
 * Per-step React Hook Form (one `useForm` per step, ARCH-001 builder state). Defaults are the server step plus any
 * unsent edits (so a reload restores them). Every change is diffed against the server resource and recorded as a pending
 * PATCH, which the store autosaves (2 s debounce) when the step passes the strict write schema. The step registers its
 * validator so Continue can validate this step only and focus the first invalid field.
 *
 * Use `FormField` / `register` with `form.control`; do not call `form.watch()` at the step root. Typing in one field
 * re-renders that field only.
 */
export function useStepForm<T extends FieldValues = FieldValues>(
  key: StepDataKey,
  options: StepFormOptions = {},
): UseFormReturn<T> {
  const store = useBuilderStore()
  const [defaultValues] = useState(() => {
    const state = store.getState()
    return overlayStep(key, state.server[key], state.pending[key]) as unknown as DefaultValues<T>
  })
  const schema = (options.schema ?? STEP_FORM_SCHEMAS[key]) as unknown as ZodType<T, T>
  const form = useForm<T, unknown, T>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues,
    resolver: zodResolver(schema),
  })
  const { subscribe, trigger, setError, clearErrors } = form

  useEffect(() => {
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        store.setStepValues(key, values as Record<string, unknown>)
      },
    })
    const unregister = store.registerValidator(key, () => trigger(undefined, { shouldFocus: true }))
    return () => {
      unsubscribe()
      unregister()
    }
  }, [store, key, subscribe, trigger])

  // Server messages of fields the API rejected (M2) appear next to the field and go when the admin edits it.
  const fieldErrors = useBuilderSelector((state) => state.fieldErrors)
  const applied = useRef<ReadonlySet<string>>(new Set())
  useEffect(() => {
    const next = new Set<string>()
    for (const [path, message] of Object.entries(fieldErrors)) {
      if (!path.startsWith(`${key}.`)) continue
      const name = formFieldName(path) as Path<T>
      next.add(name)
      setError(name, { type: 'server', message }, { shouldFocus: !applied.current.has(name) })
    }
    for (const name of applied.current) if (!next.has(name)) clearErrors(name as Path<T>)
    applied.current = next
  }, [fieldErrors, key, setError, clearErrors])

  return form as unknown as UseFormReturn<T>
}
