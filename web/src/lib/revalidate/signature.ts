import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// HMAC verification (ARCH-001-isr-revalidation section 4; SEC-001 F-07). Signing string: `${timestamp}.${eventId}.${rawBody}`
// as bytes, key = the secret as UTF-8, header `v1=<64 lowercase hex>`.

const SIGNATURE_SHAPE = /^v1=([0-9a-f]{64})$/
const EVENT_ID_SHAPE = /^[A-Za-z0-9-]{8,64}$/

/** Event ids are UUIDs; the shape check keeps `.` and other separators out of the signed string. */
export function isValidEventId(value: string | null): value is string {
  return value !== null && EVENT_ID_SHAPE.test(value)
}

/** Strict parse of the header; returns the 32 digest bytes, or undefined when malformed (never throws). */
export function parseSignatureHeader(header: string | null): Buffer | undefined {
  if (header === null) return undefined
  const match = SIGNATURE_SHAPE.exec(header)
  return match?.[1] === undefined ? undefined : Buffer.from(match[1], 'hex')
}

/** The expected `v1=<hex>` value for the given parts. Exposed for the by-hand proof and for secret rotation. */
export function computeSignature(secret: string, timestamp: string, eventId: string, rawBody: Uint8Array): string {
  const mac = createHmac('sha256', Buffer.from(secret, 'utf8'))
  mac.update(`${timestamp}.${eventId}.`, 'utf8')
  mac.update(rawBody)
  return `v1=${mac.digest('hex')}`
}

/**
 * True if the header matches an HMAC computed with any of the secrets (current, then the rotation-previous one).
 * Digests are compared at equal length with timingSafeEqual (never throws on a short input); all secrets are tried so
 * timing does not reveal which one matched.
 */
export function verifySignature(
  secrets: readonly string[],
  timestamp: string,
  eventId: string,
  rawBody: Uint8Array,
  header: string | null,
): boolean {
  const provided = parseSignatureHeader(header)
  if (provided === undefined) return false
  let ok = false
  for (const secret of secrets) {
    if (secret === '') continue
    const expected = Buffer.from(computeSignature(secret, timestamp, eventId, rawBody).slice(3), 'hex')
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) ok = true
  }
  return ok
}
