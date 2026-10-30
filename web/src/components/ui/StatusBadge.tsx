import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Meaning of the badge, not decoration (COMPONENT-CATALOG). Text colour is always an `-ink` token on a 10% tint of the
 * fill colour; contrast on parchment / parchment-soft / sand / admin-panel:
 *  success  success-ink  6.17 / 6.64 / 5.35 / 6.59   AA
 *  warning  warning-ink  5.14 / 5.53 / 4.46 / 5.48   AA except sand (4.46): do not place a warning badge on sand
 *  danger   danger-ink   6.92 / 7.44 / 5.99 / 7.38   AA
 *  copper   copper-ink   6.05 / 6.51 / 5.25 / 6.45   AA   (category, not state)
 *  neutral  ink-soft     6.39 / 6.89 / 5.51 / 6.83   AA   (draft, archived, unknown)
 * The reference `.status-badge--forest` (parchment on forest) is not a tone here; add one when a screen needs it.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'copper'

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-success/25 bg-success/10 text-success-ink',
  warning: 'border-warning/25 bg-warning/10 text-warning-ink',
  danger: 'border-danger/25 bg-danger/10 text-danger-ink',
  neutral: 'border-line bg-ink/5 text-ink-soft',
  copper: 'border-copper/30 bg-copper/10 text-copper-ink',
}

interface StatusBadgeProps {
  tone?: StatusTone
  /**
   * Optional icon from components/ui/icons (`<Check size="sm" />`). It reinforces the text; it never replaces it.
   * Decorative (aria-hidden), so keep it paired with the visible label.
   */
  icon?: ReactNode
  /** Layout additions only (margin, alignment). */
  className?: string
  /** The status in words ("Registered", "Payment failed"). Always required: colour is never the only cue (AC-91). */
  children: ReactNode
}

/**
 * Small uppercase state label (reference `.status-badge`: Fragment Mono 0.62rem). Fragment Mono ships at weight 400
 * only, so the reference's 600 would be a faux bold (ASSET-INVENTORY D4); the tint and border carry the emphasis.
 * 0.62rem is below the type scale, so the size is `text-xs` (0.75rem), still uppercase. The label may wrap at 320px. Static and read in order:
 * it is not a live region. Where a status changes while the user watches, announce it through the shared live region.
 * Server Component.
 */
export function StatusBadge({ tone = 'neutral', icon, className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 max-w-full items-center justify-center gap-1 rounded-public border px-2 py-1 text-center font-mono text-xs leading-none font-normal tracking-button wrap-break-word uppercase',
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
