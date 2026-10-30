import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Banner meaning. Text is always `ink` on a light tint, so contrast does not depend on the tone; the tone shows in the
 * left rule and the screen-reader label word, never in colour alone.
 */
export type BannerTone = 'info' | 'success' | 'warning' | 'danger'

const TONE_CLASS: Record<BannerTone, string> = {
  info: 'border-line border-l-forest-muted bg-sand/40',
  success: 'border-line border-l-success bg-success/10',
  warning: 'border-line border-l-warning bg-warning/10',
  danger: 'border-line border-l-danger bg-danger/10',
}

const LABEL: Record<BannerTone, string> = {
  info: 'Note',
  success: 'Done',
  warning: 'Heads up',
  danger: 'Problem',
}

interface BannerProps {
  tone?: BannerTone
  /** Bold lead-in sentence. Optional. */
  title?: string
  /**
   * `none` (default) is a static message. `alert` interrupts and announces once: only for a problem that appears
   * after the page loaded (a failed save). Never use both a toast and an alert for the same message.
   */
  live?: 'none' | 'alert'
  /** Optional action (a Button or link), under the text at 320 and beside it from `sm`. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Inline page or section message (offline notice, "event changed", unsaved warning). Server Component. */
export function Banner({ tone = 'info', title, live = 'none', action, className, children }: BannerProps) {
  return (
    <div
      role={live === 'alert' ? 'alert' : undefined}
      className={cn(
        'flex flex-col gap-3 border border-l-4 p-4 text-ink sm:flex-row sm:items-center sm:justify-between',
        TONE_CLASS[tone],
        className,
      )}
    >
      <p className="min-w-0 text-sm wrap-break-word">
        <span className="sr-only">{LABEL[tone]}: </span>
        {title === undefined ? null : <strong className="font-strong">{title} </strong>}
        {children}
      </p>
      {action === undefined ? null : <div className="shrink-0">{action}</div>}
    </div>
  )
}
