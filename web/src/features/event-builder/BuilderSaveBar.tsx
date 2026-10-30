'use client'

import { SaveBar } from '@/components/admin/SaveBar'
import { Banner } from '@/components/ui/feedback/Banner'
import { Button } from '@/components/ui/Button'
import { copyFor } from '@/lib/api/error-copy'
import { hasPending, parseBlockerField, patchPaths, splitStaged } from '@/features/event-builder/patch'
import { useBuilderSelector, useBuilderStore } from '@/features/event-builder/context'
import { useGoToStep } from '@/features/event-builder/nav-context'
import type { BuilderState } from '@/features/event-builder/store'
import { BUILDER_STEP_DEFINITIONS } from '@/features/event-builder/steps'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'

const STEP_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  BUILDER_STEP_DEFINITIONS.map((step) => [step.id, step.label]),
)

/** Staged operational edits of a public event as a stable string (selectors must return stable values). */
function stagedKey(state: BuilderState): string {
  return patchPaths(splitStaged(state.pending, state.server.status).staged).join(',')
}

/**
 * Save status as its own small subscriber (TASK-077): the SaveBar (FE-14) with VERSION_CONFLICT handling, plus
 *  - a failed-save banner that keeps the admin's changes,
 *  - the server's messages for rejected fields (each with a link to its step), and
 *  - the "Apply changes" gate: on a public event, operational edits (capacity, price, pairing, rating ...) are not
 *    autosaved because the server asks for step-up for them; the admin applies them on purpose (M1).
 * Re-renders on save status and dirty changes only, not per keystroke.
 */
export function BuilderSaveBar() {
  const store = useBuilderStore()
  const goTo = useGoToStep()
  const dirty = useBuilderSelector((state) => hasPending(state.pending))
  const saving = useBuilderSelector((state) => state.save === 'saving')
  const failed = useBuilderSelector((state) => state.save === 'error')
  const error = useBuilderSelector((state) => state.error)
  const conflict = useBuilderSelector((state) => state.conflict)
  const fieldErrors = useBuilderSelector((state) => state.fieldErrors)
  const formError = useBuilderSelector((state) => state.formError)
  const staged = useBuilderSelector(stagedKey)

  const copy = failed ? copyFor(error, { action: 'save your changes' }) : null
  const rejected = Object.entries(fieldErrors)

  return (
    <div className="flex flex-col">
      {copy === null ? null : (
        <div className="px-gutter pt-3">
          <Banner
            tone="danger"
            live="alert"
            title={copy.title}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  void store.flush()
                }}
              >
                Try again
              </Button>
            }
          >
            {copy.body} Your changes are kept on this page.
            {formError === null ? null : ` ${formError}`}
          </Banner>
        </div>
      )}
      {rejected.length === 0 ? null : (
        <div className="px-gutter pt-3">
          <Banner tone="warning" live="alert" title="Some changes were not accepted.">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {rejected.map(([path, message]) => {
                const step = parseBlockerField(path).step as BuilderStep | null
                return (
                  <li key={path} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 wrap-break-word">
                      {step === null ? '' : `${STEP_LABEL[step] ?? 'Step'}: `}
                      {message}
                    </span>
                    {step === null ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          goTo(step)
                        }}
                      >
                        Go to {STEP_LABEL[step] ?? 'step'}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Banner>
        </div>
      )}
      {staged === '' ? null : (
        <div className="px-gutter pt-3">
          <Banner
            tone="info"
            title="Changes waiting for your confirmation."
            action={
              <Button
                loading={saving}
                loadingLabel="Applying"
                disabled={conflict !== null}
                onClick={() => {
                  void store.applyStaged()
                }}
              >
                Apply changes
              </Button>
            }
          >
            This event is live, so capacity, price, pairing and rating changes are not saved automatically. Applying
            them asks you to confirm your password.
          </Banner>
        </div>
      )}
      <SaveBar
        dirty={dirty}
        saving={saving}
        conflict={conflict}
        onSave={() => {
          void store.flush()
        }}
        onDiscard={store.discard}
        onReloadLatest={store.loadLatest}
      />
    </div>
  )
}
