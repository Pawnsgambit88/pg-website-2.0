import { NO_VALUE } from '@/lib/format/placeholder'

const MINUS = '−'
const ORDINAL_SUFFIXES: Readonly<Record<number, string>> = { 1: 'st', 2: 'nd', 3: 'rd' }

/**
 * Signed rating change: "+12", "−8" (U+2212, not a hyphen, so it matches the plus sign in width and is not read as a
 * dash) and "0" for no change. Ratings are whole numbers; anything else gives "—".
 */
export function formatRatingDelta(delta: number): string {
  if (typeof delta !== 'number' || !Number.isSafeInteger(delta)) return NO_VALUE
  if (delta === 0) return '0'
  return delta > 0 ? `+${delta}` : `${MINUS}${Math.abs(delta)}`
}

/** English ordinal for a position: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 112th. Needs an integer of 1 or more. */
export function formatOrdinal(position: number): string {
  if (typeof position !== 'number' || !Number.isSafeInteger(position) || position < 1) return NO_VALUE
  const lastTwo = position % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : (ORDINAL_SUFFIXES[position % 10] ?? 'th')
  return `${position}${suffix}`
}
