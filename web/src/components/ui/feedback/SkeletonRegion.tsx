import type { ReactNode } from 'react'

interface SkeletonRegionProps {
  /** What is loading, for screen readers ("Loading your events"). Default "Loading". */
  label?: string
  /** Layout additions only. */
  className?: string
  /** `Skeleton` blocks that mirror the final layout. */
  children: ReactNode
}

/**
 * One loading region: `aria-busy`, a single visually hidden "Loading" status, and the skeleton blocks hidden from
 * assistive technology. Put one around each independently loading section (AC-40), not around each block.
 * Server Component.
 */
export function SkeletonRegion({ label = 'Loading', className, children }: SkeletonRegionProps) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        {label}
      </span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}
