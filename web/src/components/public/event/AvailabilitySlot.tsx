import { AvailabilityBadge } from '@/components/public/events/AvailabilityBadge'

interface AvailabilitySlotProps {
  /** Only primitives cross into the island (RBP server-serialization). */
  slug: string
  /** Coarse last-known hint from the cached DTO; null when unknown. */
  placesLeftHint: number | null
  /** Poll live availability. False for a state that cannot change from here (live event). */
  live: boolean
}

/**
 * Availability block in the decision panel (ARCH-001 9.6, 7.3 rule 4, AC-19). The cached HTML shows the last-known
 * hint (or neutral "checking" text), never a cached number presented as live; after hydration `AvailabilityBadge`
 * polls the public, token-free fetcher every 30 s. The min-height reserves the line so nothing moves when it updates.
 */
export function AvailabilitySlot({ slug, placesLeftHint, live }: AvailabilitySlotProps) {
  return (
    <div className="flex min-h-11 flex-col justify-center" data-availability-slot={slug}>
      <p className="type-eyebrow text-muted">Availability</p>
      <AvailabilityBadge slug={slug} hint={placesLeftHint} live={live} className="font-strong wrap-break-word" />
    </div>
  )
}
