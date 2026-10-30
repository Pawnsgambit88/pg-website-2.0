// Opaque random values and fingerprints for the mock auth backend (TASK-021).
// Tokens are random opaque strings, deliberately NOT JWTs: there is no claim to read, so nothing in the app can be
// tempted to take the role from a token (ARCH-001 12.6). `crypto.getRandomValues` exists in every browser of the floor
// (also on plain-http LAN origins, unlike `crypto.randomUUID`) and in Node.

export type TokenKind = 'at' | 'rt' | 'su' | 'oc'

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(buffer)
  let out = ''
  for (const byte of buffer) out += byte.toString(16).padStart(2, '0')
  return out
}

/** `pgm_<kind>_<48 hex>`: access (at), refresh (rt), step-up (su), OAuth one-time code (oc). */
export function opaqueToken(kind: TokenKind): string {
  return `pgm_${kind}_${randomHex(24)}`
}

/** RFC 4122 version 4 UUID from random bytes. */
export function randomUuid(): string {
  const hex = randomHex(16).split('')
  hex[12] = '4'
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16)
  const s = hex.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

/**
 * 64-bit non-cryptographic fingerprint (two 32-bit FNV-style lanes). The mock session store keeps fingerprints of
 * tokens, codes and passwords, never the values themselves. Good enough for a mock: it is not a password hash.
 */
export function fingerprint(value: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}
