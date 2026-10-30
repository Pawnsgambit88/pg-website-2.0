import { cn } from '@/lib/cn'

interface ProgressBarProps {
  /** Accessible name ("Uploading cover.jpg"). Required: a bar with no name is noise. */
  label: string
  /** 0 to 100. Omit for an indeterminate bar (unknown duration). */
  value?: number
  /** Show the percentage as text beside the bar. Default true when `value` is set. */
  showValue?: boolean
  className?: string
}

/**
 * Determinate or indeterminate progress (upload, multi-step save). `role="progressbar"` with `aria-valuenow`; it is not
 * a live region, so progress is not read on every tick. The indeterminate bar pulses only under `motion-safe`,
 * otherwise it is a still half-filled track. Server Component.
 */
export function ProgressBar({ label, value, showValue, className }: ProgressBarProps) {
  const percent =
    typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : undefined
  const text = (showValue ?? true) && percent !== undefined
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-public bg-sand"
      >
        <div
          className={cn('h-full bg-forest', percent === undefined && 'w-1/2 motion-safe:animate-pulse')}
          style={percent === undefined ? undefined : { width: `${String(percent)}%` }}
        />
      </div>
      {text ? <span className="w-10 shrink-0 text-right font-mono text-xs text-ink-soft">{percent}%</span> : null}
    </div>
  )
}
