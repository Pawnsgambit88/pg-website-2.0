// ISO 8601 date-time on the IST wall clock with an explicit `+05:30` offset, for schema.org dates (TASK-112,
// ARCH-001 8.2, AC-12). Pure arithmetic through lib/format/instant: no Intl, no system time zone, so the output is the
// same on every server and under any TZ. India has a fixed +05:30 offset (no daylight saving).
import { type InstantInput, parseInstant } from '@/lib/format/instant'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const IST_OFFSET = '+05:30'

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

/** `2026-10-24T17:00:00+05:30` for the instant, or `null` when the input is not a valid instant with an offset. */
export function toIstIsoString(input: InstantInput): string | null {
  const ms = parseInstant(input)
  if (ms === null) return null
  const wall = new Date(ms + IST_OFFSET_MS)
  const year = wall.getUTCFullYear()
  if (year < 0 || year > 9999) return null
  return (
    `${pad(year, 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}${IST_OFFSET}`
  )
}
