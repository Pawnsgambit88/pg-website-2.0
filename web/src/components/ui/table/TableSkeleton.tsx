interface TableSkeletonProps {
  rows?: number
  /** Accessible text announced once while loading. */
  label?: string
}

const BAR_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4', 'w-2/5'] as const

/** Placeholder rows shown while a table loads. Pulses only when the user allows motion. */
export function TableSkeleton({ rows = 5, label = 'Loading' }: TableSkeletonProps) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 p-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="grid gap-2 border-b border-line-admin pb-3 last:border-b-0">
          <div className={`h-4 bg-line motion-safe:animate-pulse ${BAR_WIDTHS[i % BAR_WIDTHS.length]}`} />
          <div className="h-4 w-full bg-line motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}
