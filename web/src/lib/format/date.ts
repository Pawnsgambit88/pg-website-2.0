import { type InstantInput, type IstParts, parseInstant, toIstParts } from '@/lib/format/instant'
import { NO_VALUE } from '@/lib/format/placeholder'

// Dates and times are always shown on the Asia/Kolkata wall clock with "IST" named (ARCH-001 13.9, A-09, AC-114).
// Output is built from constant tables, not from `Intl`, because ICU data differs between Node and browsers
// (for example U+202F before "PM" in newer ICU), which would cause hydration mismatches.

const TIME_ZONE_LABEL = 'IST'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export interface EventDateOptions {
  /** `short` gives "Sat", `long` gives "Saturday", `none` omits it. Default `short`. */
  weekday?: 'short' | 'long' | 'none'
  /** Include the year. Default `true`. */
  year?: boolean
}

function dateText(parts: IstParts, { weekday = 'short', year = true }: EventDateOptions): string {
  const weekdayText =
    weekday === 'none' ? '' : `${(weekday === 'long' ? WEEKDAYS_LONG : WEEKDAYS_SHORT)[parts.weekday] ?? ''}, `
  const yearText = year ? ` ${parts.year}` : ''
  return `${weekdayText}${parts.day} ${MONTHS[parts.month - 1] ?? ''}${yearText}`
}

function timeText(parts: IstParts): string {
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  const meridiem = parts.hour < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(parts.minute).padStart(2, '0')} ${meridiem}`
}

/** IST calendar date: `Sat, 24 Oct 2026`. Invalid input gives "—". */
export function formatEventDate(input: InstantInput, options: EventDateOptions = {}): string {
  const ms = parseInstant(input)
  return ms === null ? NO_VALUE : dateText(toIstParts(ms), options)
}

/** IST date and start time with the zone named: `Sat, 24 Oct 2026, 5:00 PM IST`. Invalid input gives "—". */
export function formatEventDateTime(input: InstantInput, options: EventDateOptions = {}): string {
  const ms = parseInstant(input)
  if (ms === null) return NO_VALUE
  const parts = toIstParts(ms)
  return `${dateText(parts, options)}, ${timeText(parts)} ${TIME_ZONE_LABEL}`
}

/**
 * IST time or time range with the zone named: `5:00 PM IST`, `5:00 PM – 8:30 PM IST`.
 * An end on a later IST day adds the day offset (`11:00 PM – 1:00 AM IST (+1 day)`). An absent, invalid or
 * not-after-start end shows the start only. An invalid start gives "—".
 */
export function formatTimeRange(start: InstantInput, end?: InstantInput | null): string {
  const startMs = parseInstant(start)
  if (startMs === null) return NO_VALUE
  const startParts = toIstParts(startMs)
  const endMs = end === undefined || end === null ? null : parseInstant(end)
  if (endMs === null || endMs <= startMs) return `${timeText(startParts)} ${TIME_ZONE_LABEL}`
  const endParts = toIstParts(endMs)
  const dayShift = endParts.dayNumber - startParts.dayNumber
  const shiftText = dayShift > 0 ? ` (+${dayShift} ${dayShift === 1 ? 'day' : 'days'})` : ''
  return `${timeText(startParts)} – ${timeText(endParts)} ${TIME_ZONE_LABEL}${shiftText}`
}
