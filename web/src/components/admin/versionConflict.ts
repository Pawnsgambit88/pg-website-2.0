import type { LastChangeDto } from '@/lib/api/types/admin/common'

// VERSION_CONFLICT helpers (FE-14). The error body has no slot for the other editor, so the flow is: a versioned write fails
// with VERSION_CONFLICT -> the page re-reads the resource -> it passes that resource's `lastChange` to SaveBar.

/** Duck-typed (ApiError, TokenError and test doubles all qualify). */
export function isVersionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'VERSION_CONFLICT'
}

/** The other editor, as SaveBar shows it. `null` fields mean the resource carried no `lastChange`. */
export interface ConflictInfo {
  /** Name of the other editor, when known. */
  by: string | null
  /** ISO instant of their change, when known. */
  at: string | null
  /** What they changed, when the server said. */
  summary: string | null
}

export function conflictFromLastChange(lastChange: LastChangeDto | null | undefined): ConflictInfo {
  return { by: lastChange?.by.name ?? null, at: lastChange?.at ?? null, summary: lastChange?.summary ?? null }
}

/** "Asha at 14:05" style sentence; never includes server free text beyond the already-validated name and summary. */
export function describeConflict(info: ConflictInfo, locale?: string): string {
  const who = info.by ?? 'Someone else'
  const when = info.at === null ? '' : formatTime(info.at, locale)
  const base =
    when === ''
      ? `${who} changed this while you were editing.`
      : `${who} changed this at ${when} while you were editing.`
  return info.summary === null || info.summary === '' ? base : `${base} Their change: ${info.summary}`
}

function formatTime(iso: string, locale: string | undefined): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}
