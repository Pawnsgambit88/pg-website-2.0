import type { Focal } from '@/lib/api/types/primitives'

// Focal point -> CSS `object-position` (ARCH-001 13.3, SEC-001 F-14). The output is built only from numbers, so no
// string from data ever reaches a style attribute. The zod schema already rejects out-of-range values; this clamps again
// because the component can be fed from places that skipped the schema (mock fixtures, the admin focal-point picker
// preview while dragging).

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5)

/** Percentage with at most two decimals, so 0.3333 stays stable in snapshots and style attributes. */
const percent = (value: number): string => `${Math.round(clamp01(value) * 10000) / 100}%`

export const CENTER_OBJECT_POSITION = '50% 50%'

export function focalToObjectPosition(focal: Focal | undefined): string {
  if (focal === undefined) return CENTER_OBJECT_POSITION
  return `${percent(focal.x)} ${percent(focal.y)}`
}
