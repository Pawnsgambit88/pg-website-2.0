import { conflictFromLastChange, isVersionConflict, type ConflictInfo } from '@/components/admin/versionConflict'
import { fieldErrorsFrom } from '@/lib/api/error-copy'
import { loadBackup, saveBackup } from '@/features/event-builder/backup'
import {
  classifyRejected,
  deepEqual,
  diffStep,
  dropPaths,
  hasPending,
  splitStaged,
} from '@/features/event-builder/patch'
import { patchSchemaFor } from '@/features/event-builder/step-schemas'
import { STEP_DATA_KEYS, type PendingPatch, type StepDataKey } from '@/features/event-builder/types'
import type { BuilderDraftDto, UpdateBuilderDraftInput } from '@/lib/api/types/admin/event-builder'

// Vanilla store of the Event Builder (ARCH-001 builder state; TASK-077). Framework free: React reads it through
// `useSyncExternalStore` selectors (context.tsx), so a keystroke in one field re-renders only the subscribers whose
// selected value changed.
//
// Two layers: `server` is the last resource the API returned (with its `version`); `pending` holds edits not yet accepted,
// per step, in WRITE shape (E04 body). Typing in a step form writes `pending[step]` as the diff against `server`. A
// debounced autosave (2 s) sends pending steps that are valid; the response replaces `server` and drops exactly the fields
// that were sent (edits typed during the request survive).

export const AUTOSAVE_DELAY_MS = 2000

export type SaveStatus = 'idle' | 'saving' | 'error'

export interface BuilderState {
  server: BuilderDraftDto
  pending: PendingPatch
  save: SaveStatus
  /** The failure of the last save (kept with the user's changes). Not rendered raw: use `copyFor`. */
  error: unknown
  /** Set after VERSION_CONFLICT and a re-read. Save is blocked until the admin loads the other version. */
  conflict: ConflictInfo | null
  /** The re-read resource waiting behind a conflict. */
  latest: BuilderDraftDto | null
  /** Bumped when step forms must rebuild their defaults (discard, load latest). */
  resetKey: number
  /** True when unsent edits were restored from the session backup at start. */
  restored: boolean
  savedAt: number | null
  /** Server messages of rejected fields by builder path (
egistration.capacity), shown next to the field (M2). */
  fieldErrors: Readonly<Record<string, string>>
  /** A rejection the server could not tie to a field. */
  formError: string | null
}

export interface BuilderStoreOptions {
  initial: BuilderDraftDto
  /** E04. Resolves the whole resource. */
  save: (patch: Omit<UpdateBuilderDraftInput, 'version'>, version: number) => Promise<BuilderDraftDto>
  /** E03, used after VERSION_CONFLICT. */
  reload: () => Promise<BuilderDraftDto>
  /** Called after every accepted save (cache sync). */
  onSaved?: (draft: BuilderDraftDto) => void
  delayMs?: number
}

export type StepValidator = () => Promise<boolean>

export interface BuilderStore {
  getState: () => BuilderState
  subscribe: (listener: () => void) => () => void
  /** A step form changed: record its diff against the server resource and schedule the autosave. */
  setStepValues: (key: StepDataKey, values: Record<string, unknown>) => void
  /** Send now (Save draft, Continue). Resolves when the request settled. Staged operational edits stay staged. */
  flush: () => Promise<void>
  /** Sends everything including staged operational edits of a public event; the server may ask for step-up (M1). */
  applyStaged: () => Promise<void>
  /** Drop unsent edits and rebuild step forms from the server resource. */
  discard: () => void
  /** After a conflict: take the other editor's version, dropping local edits. */
  loadLatest: () => void
  /** Clear a failed-save banner without losing edits. */
  dismissError: () => void
  registerValidator: (key: StepDataKey, validator: StepValidator) => () => void
  /** Takes a fresh resource after a lifecycle command (publish, unpublish). Unsent edits stay. */
  adoptServer: (next: BuilderDraftDto) => void
  /** Stops the autosave timer (provider unmount). */
  stop: () => void
  /** Runs the registered validator of a step (focuses the first invalid field). True when none is registered. */
  validateStep: (key: StepDataKey) => Promise<boolean>
}

export function createBuilderStore(options: BuilderStoreOptions): BuilderStore {
  const { initial, save, reload, onSaved, delayMs = AUTOSAVE_DELAY_MS } = options
  const restoredPending = loadBackup(initial.id, initial.version)
  let state: BuilderState = {
    server: initial,
    pending: restoredPending ?? {},
    save: 'idle',
    error: null,
    conflict: null,
    latest: null,
    resetKey: 0,
    restored: hasPending(restoredPending),
    savedAt: null,
    fieldErrors: {},
    formError: null,
  }
  const listeners = new Set<() => void>()
  const validators = new Map<StepDataKey, StepValidator>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let inFlight: Promise<void> | null = null
  let again = false
  /** Values the server rejected, by builder path. They are not resent until the admin changes them (M2). */
  const rejectedValues = new Map<string, unknown>()

  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  const set = (next: Partial<BuilderState>): void => {
    state = { ...state, ...next }
    emit()
  }
  const backup = (): void => {
    saveBackup(state.server.id, state.server.version, hasPending(state.pending) ? state.pending : null)
  }
  const clearTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const schedule = (): void => {
    clearTimer()
    if (state.conflict !== null) return
    timer = setTimeout(() => {
      void flush()
    }, delayMs)
  }

  /** Steps whose pending fields pass the strict write schema; a half-typed invalid step waits for the admin to fix it. */
  function sendable(includeStaged = false): PendingPatch {
    const out: PendingPatch = {}
    const source = includeStaged ? state.pending : splitStaged(state.pending, state.server.status).autosave
    for (const key of STEP_DATA_KEYS) {
      const fields = source[key]
      if (fields === undefined || Object.keys(fields).length === 0) continue
      if (patchSchemaFor(key).safeParse(fields).success) out[key] = fields
    }
    return out
  }

  async function run(includeStaged = false): Promise<void> {
    const sent = sendable(includeStaged)
    if (!hasPending(sent)) return
    const base = state.server
    set({ save: 'saving', error: null })
    try {
      const next = await save(sent as Omit<UpdateBuilderDraftInput, 'version'>, base.version)
      const remaining: PendingPatch = {}
      for (const key of STEP_DATA_KEYS) {
        const now = state.pending[key]
        if (now === undefined) continue
        const left: Record<string, unknown> = {}
        for (const [field, value] of Object.entries(now)) {
          if (!deepEqual(sent[key]?.[field], value) || !(key in sent)) left[field] = value
        }
        if (Object.keys(left).length > 0) remaining[key] = left
      }
      set({ server: next, pending: remaining, save: 'idle', savedAt: Date.now(), restored: false, formError: null })
      backup()
      onSaved?.(next)
    } catch (error) {
      if (isVersionConflict(error)) {
        try {
          const latest = await reload()
          set({ save: 'idle', conflict: conflictFromLastChange(latest.lastChange), latest, error: null })
        } catch (reloadError) {
          set({ save: 'error', error: reloadError })
        }
      } else {
        await handleRejected(error, sent)
      }
    }
  }

  function clearRejection(path: string): void {
    if (!rejectedValues.delete(path) && !(path in state.fieldErrors)) return
    set({ fieldErrors: Object.fromEntries(Object.entries(state.fieldErrors).filter(([name]) => name !== path)) })
  }

  /**
   * A refusal that names fields (400/409/422 with error.fields): show each server message at its field, drop the
   * rejected values from the pending patch so the other fields still save, re-read the draft (lock and slug state) and
   * send what is left. Nothing is resent unchanged, so there is no loop.
   */
  async function handleRejected(error: unknown, sent: PendingPatch): Promise<void> {
    const status = (error as { status?: unknown } | null)?.status
    const fields = status === 400 || status === 409 || status === 422 ? fieldErrorsFrom(error) : {}
    const { rejected, unmapped } = classifyRejected(fields, sent)
    // A value the admin has changed since the request is a new edit, not the rejected one.
    const paths = Object.keys(rejected).filter((path) => {
      const [key, field = ''] = path.split('.')
      return deepEqual(state.pending[key as StepDataKey]?.[field], sent[key as StepDataKey]?.[field])
    })
    if (paths.length === 0) {
      set({ save: 'error', error, formError: unmapped[0] ?? null })
      return
    }
    const fieldErrors: Record<string, string> = { ...state.fieldErrors }
    for (const path of paths) {
      const [key, field = ''] = path.split('.')
      rejectedValues.set(path, state.pending[key as StepDataKey]?.[field])
      fieldErrors[path] = rejected[path] ?? ''
    }
    set({
      pending: dropPaths(state.pending, paths),
      fieldErrors,
      formError: unmapped[0] ?? null,
      save: 'idle',
      error: null,
    })
    backup()
    try {
      const latest = await reload()
      set({ server: latest })
      backup()
      onSaved?.(latest)
    } catch {
      // The messages stay; the next save reads the version again through VERSION_CONFLICT.
    }
    if (state.conflict === null && hasPending(sendable())) schedule()
  }

  function flush(includeStaged = false): Promise<void> {
    clearTimer()
    if (state.conflict !== null) return Promise.resolve()
    if (inFlight !== null) {
      again = true
      return inFlight
    }
    inFlight = run(includeStaged).finally(() => {
      inFlight = null
      if (again) {
        again = false
        if (state.save !== 'error' && state.conflict === null && hasPending(sendable())) schedule()
      }
    })
    return inFlight
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setStepValues: (key, values) => {
      const diff = diffStep(
        key,
        state.server[key] as unknown as Record<string, unknown>,
        values,
        state.server.lockedFields,
      )
      // A rejected value stays out of the patch until the admin changes it (M2); reverting it also clears the message.
      for (const path of [...rejectedValues.keys()]) {
        const [rKey, rField = ''] = path.split('.')
        if (rKey !== key) continue
        if (!(rField in diff)) clearRejection(path)
        else if (deepEqual(rejectedValues.get(path), diff[rField])) delete diff[rField]
        else clearRejection(path)
      }
      const before = state.pending[key] ?? {}
      if (deepEqual(before, diff)) return
      const pending = { ...state.pending }
      if (Object.keys(diff).length === 0) delete pending[key]
      else pending[key] = diff
      set({ pending, restored: false })
      backup()
      schedule()
    },
    flush: () => flush(false),
    applyStaged: async () => {
      if (inFlight !== null) await inFlight
      await flush(true)
    },
    discard: () => {
      clearTimer()
      rejectedValues.clear()
      set({
        fieldErrors: {},
        formError: null,
        pending: {},
        resetKey: state.resetKey + 1,
        restored: false,
        error: null,
        save: 'idle',
      })
      backup()
    },
    loadLatest: () => {
      if (state.latest === null) return
      clearTimer()
      rejectedValues.clear()
      set({
        fieldErrors: {},
        formError: null,
        server: state.latest,
        latest: null,
        conflict: null,
        pending: {},
        resetKey: state.resetKey + 1,
        restored: false,
        error: null,
      })
      backup()
      onSaved?.(state.server)
    },
    dismissError: () => {
      set({ error: null, save: state.save === 'error' ? 'idle' : state.save })
    },
    registerValidator: (key, validator) => {
      validators.set(key, validator)
      return () => {
        if (validators.get(key) === validator) validators.delete(key)
      }
    },
    adoptServer: (next) => {
      set({ server: next })
      backup()
      onSaved?.(next)
    },
    stop: clearTimer,
    validateStep: async (key) => {
      const validator = validators.get(key)
      return validator === undefined ? true : validator()
    },
  }
}
