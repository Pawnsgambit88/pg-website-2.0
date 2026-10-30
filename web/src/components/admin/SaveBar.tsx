'use client'

import { useEffect, useId } from 'react'
import { describeConflict, type ConflictInfo } from '@/components/admin/versionConflict'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/feedback/Banner'

export interface SaveBarProps {
  /** Unsaved edits exist. Drives the status text, the Save button and the leave-page warning. */
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onDiscard?: () => void
  /** Draft/publish resources: omit for plain save-only forms. */
  onPublish?: () => void
  publishing?: boolean
  /** Publish is unavailable. The reason is shown as visible text and linked to the button (AC-84). */
  publishBlockedReason?: string
  /** Set after a VERSION_CONFLICT and a re-read: shows the other editor and the reload action. */
  conflict?: ConflictInfo | null
  /** Reload the other editor's version (discards local edits). Required with `conflict`. */
  onReloadLatest?: () => void
  /** Saved but not published (shown when not dirty and there is something unpublished). */
  hasUnpublishedChanges?: boolean
  publishLabel?: string
}

/**
 * Sticky save bar for admin editors (FE-14). States: clean, dirty, saving, saved-but-unpublished, publish blocked (with
 * reason) and VERSION_CONFLICT. While in conflict Save and Publish are disabled (a stale `version` can only fail again):
 * the admin reloads the latest version, then re-applies their edits. `beforeunload` warns about unsaved edits.
 * Buttons use `aria-disabled` so they stay focusable and the reason is reachable.
 */
export function SaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  onPublish,
  publishing = false,
  publishBlockedReason,
  conflict = null,
  onReloadLatest,
  hasUnpublishedChanges = false,
  publishLabel = 'Publish',
}: SaveBarProps) {
  const statusId = useId()
  const reasonId = useId()
  const inConflict = conflict !== null
  const busy = saving || publishing

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
    }
  }, [dirty])

  const status = inConflict
    ? 'Not saved: a newer version exists.'
    : saving
      ? 'Saving'
      : dirty
        ? 'Unsaved changes'
        : hasUnpublishedChanges
          ? 'Saved, not published yet'
          : 'All changes saved'

  const canSave = dirty && !busy && !inConflict
  const canPublish =
    onPublish !== undefined &&
    !dirty &&
    !busy &&
    !inConflict &&
    publishBlockedReason === undefined &&
    hasUnpublishedChanges

  return (
    <div className="sticky bottom-0 z-header flex flex-col gap-3 border-t border-line bg-parchment/95 px-gutter pt-3 pb-safe-3 backdrop-blur-lg">
      {inConflict ? (
        <Banner
          tone="warning"
          title="Someone else saved first"
          live="alert"
          action={
            onReloadLatest === undefined ? undefined : (
              <Button variant="secondary" onClick={onReloadLatest}>
                Load their version
              </Button>
            )
          }
        >
          {describeConflict(conflict)} Load their version, then re-apply your edits.
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <p id={statusId} role="status" className="min-w-0 flex-1 text-sm text-ink">
          {status}
        </p>
        {onDiscard !== undefined && dirty && !busy ? (
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
        ) : null}
        <Button
          variant={onPublish === undefined ? 'primary' : 'secondary'}
          loading={saving}
          loadingLabel="Saving"
          disabled={!canSave}
          aria-describedby={statusId}
          onClick={canSave ? onSave : undefined}
        >
          Save
        </Button>
        {onPublish === undefined ? null : (
          <Button
            loading={publishing}
            loadingLabel="Publishing"
            disabled={!canPublish}
            aria-describedby={publishBlockedReason === undefined ? statusId : reasonId}
            onClick={canPublish ? onPublish : undefined}
          >
            {publishLabel}
          </Button>
        )}
      </div>
      {publishBlockedReason === undefined ? null : (
        <p id={reasonId} className="text-label text-muted">
          {publishBlockedReason}
        </p>
      )}
    </div>
  )
}
