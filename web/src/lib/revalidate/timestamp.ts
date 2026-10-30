import 'server-only'
import { MAX_FUTURE_SKEW_SECONDS, MAX_PAST_SKEW_SECONDS } from './limits.ts'

const UNIX_SECONDS = /^[0-9]{1,12}$/

/** Parses `X-PG-Timestamp`: decimal digits only (no sign, no fraction, no exponent). Undefined when malformed. */
export function parseTimestamp(raw: string | null): number | undefined {
  if (raw === null || !UNIX_SECONDS.test(raw)) return undefined
  return Number(raw)
}

/** True if `now - 300 s <= timestamp <= now + 60 s` (both in Unix seconds). */
export function isWithinWindow(timestamp: number, nowSeconds: number): boolean {
  return timestamp >= nowSeconds - MAX_PAST_SKEW_SECONDS && timestamp <= nowSeconds + MAX_FUTURE_SKEW_SECONDS
}
