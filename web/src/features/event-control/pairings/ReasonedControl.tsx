import type { ReactNode } from 'react'

/** A control with the visible reason it is unavailable underneath; the reason's `id` is the control's aria-describedby. */
export function ReasonedControl({ id, reason, children }: { id: string; reason: string | null; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      {children}
      {reason === null ? null : (
        <p id={id} className="text-sm text-ink-soft">
          {reason}
        </p>
      )}
    </div>
  )
}
