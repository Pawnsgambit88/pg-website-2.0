// Instant parsing and IST calendar parts. Pure arithmetic: no `Intl`, no `Date.parse`, no system time zone, so the
// result is identical on the server, in every browser and under any `TZ` (FEAT-001 FR-51, AC-114).
// India has had no daylight saving since 1945 and has a fixed +05:30 offset, so the conversion is one addition.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const DAY_MS = 86_400_000
const MAX_TIME_MS = 8.64e15

// Strict ISO 8601 with an explicit offset. A string without an offset (`2026-10-24T17:00:00`) is rejected because
// `Date.parse` would read it in the system time zone, which differs between server and client.
const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/i
const OFFSET = /^([+-])(\d{2}):(\d{2})$/

/** A point in time: a `Date`, epoch milliseconds, or an ISO 8601 string that carries an offset or `Z`. */
export type InstantInput = Date | number | string

export interface IstParts {
  year: number
  /** 1 to 12 */
  month: number
  /** 1 to 31 */
  day: number
  /** 0 (Sunday) to 6 (Saturday) */
  weekday: number
  /** 0 to 23 */
  hour: number
  /** 0 to 59 */
  minute: number
  /** Whole days since 1970-01-01 on the IST calendar; differs by 1 across an IST midnight. */
  dayNumber: number
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parseIso(value: string): number | null {
  const match = ISO_WITH_OFFSET.exec(value.trim())
  if (match === null) return null
  const [, y, mo, d, h, mi, s, frac, zone] = match
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  const hour = Number(h)
  const minute = Number(mi)
  const second = s === undefined ? 0 : Number(s)
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  if (hour > 23 || minute > 59 || second > 59) return null
  let offsetMinutes = 0
  if (zone !== undefined && zone.toUpperCase() !== 'Z') {
    const offset = OFFSET.exec(zone)
    if (offset === null) return null
    const [, sign, oh, om] = offset
    if (Number(oh) > 23 || Number(om) > 59) return null
    offsetMinutes = (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om))
  }
  const millis = frac === undefined ? 0 : Number(frac.slice(0, 3).padEnd(3, '0'))
  return Date.UTC(year, month - 1, day, hour, minute, second, millis) - offsetMinutes * 60_000
}

/** Epoch milliseconds for the input, or `null` when it is not a valid instant. Never throws. */
export function parseInstant(input: InstantInput): number | null {
  let ms: number | null
  if (typeof input === 'string') ms = parseIso(input)
  else if (input instanceof Date) ms = input.getTime()
  else if (typeof input === 'number') ms = input
  else ms = null
  if (ms === null || !Number.isFinite(ms) || Math.abs(ms) > MAX_TIME_MS) return null
  return ms
}

/** Calendar fields of an instant on the IST wall clock. */
export function toIstParts(ms: number): IstParts {
  const shifted = new Date(ms + IST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dayNumber: Math.floor((ms + IST_OFFSET_MS) / DAY_MS),
  }
}
