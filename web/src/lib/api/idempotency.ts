import { idempotencyKeySchema, type IdempotencyKey } from '@/lib/api/types/primitives'

// Idempotency keys (ARCH-001 11.8; backend contract 2.5). A caller creates the key WHEN THE USER'S INTENT STARTS (the
// first tap on "Register", "Send result", "Submit") and keeps it for every retry of that same intent. A new intent (the
// user starts over after a terminal state) creates a new key. The key is passed IN to the PgApi method; this layer never
// invents one on its own and never retries a non-idempotent call by itself.
// Pure: no module state, safe to import from the server and the browser.

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
    return bytes
  }
  // No Web Crypto at all (not a browser inside the floor). A key only has to be unique, not secret.
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  return bytes
}

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // `crypto.randomUUID` needs a secure context; `getRandomValues` does not.
  const bytes = randomBytes()
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** A fresh UUID v4 `Idempotency-Key`. Hold it in component state or a ref for the life of the intent. */
export function newIdempotencyKey(): IdempotencyKey {
  return idempotencyKeySchema.parse(uuidV4())
}
