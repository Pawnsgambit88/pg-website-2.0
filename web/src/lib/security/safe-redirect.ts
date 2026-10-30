// The single safe-redirect helper (TASK-024; ARCH-001 12.4, 17.1; SEC-001 F-20, AC-06). Every `returnTo`, every
// remembered return-to intent and every guard redirect goes through `safeRedirect`. Pure and environment-free, so it
// runs in Server Components (PermissionState), client guards and Node alike.
//
// Accepted: a same-site path that starts with exactly one `/`, made of printable ASCII only, that still looks like a
// plain path after up to three rounds of percent-decoding, parses against a placeholder origin to that same origin, is
// not an auth screen or an API path, and resolves to a page in the route registry. The value handed back is the
// PARSED `pathname + search` (never the raw input, never a hash), so what is checked is exactly what is navigated to.
//
// Rejected, among others: `https://evil.com`, `//evil.com`, `/\evil.com`, `\/evil.com`, `/%2f%2fevil.com`,
// `/%5cevil.com`, `/%09/evil.com`, double-encoded `/%252f%252fevil.com`, `javascript:` / `data:` in any case or
// encoding, `/api/...`, `/login`, `/auth/...`, dot-segment escapes such as `/app/../api/x`, and values over 512 chars.
import { resolveRoute } from '@/lib/routes/resolve'

export const MAX_REDIRECT_LENGTH = 512

/** Decoding rounds before a value is considered over-encoded and refused (catches `%25` stacking). */
const MAX_DECODE_ROUNDS = 3

/** Placeholder origin for parsing. `.invalid` is reserved (RFC 2606), so it can never be a real host. */
const BASE = 'https://pg-redirect.invalid'
const BASE_ORIGIN = new URL(BASE).origin

/** Path prefixes that are never a return-to target: the backend, the sign-in screen itself and the OAuth callback. */
const BLOCKED_PREFIXES = ['/api', '/login', '/auth'] as const

/** Scheme markers refused anywhere in any decoded form. A real path has no reason to carry them. */
const SCHEME_MARKER = /(?:java|vb)script:|data:|file:/i

/** Printable ASCII only, without the backslash: rejects whitespace, C0/C1 controls, DEL and every non-ASCII lookalike. */
function isPlainAscii(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x20 || code >= 0x7f || code === 0x5c) return false
  }
  return true
}

/** Starts with exactly one slash (not `//`, and `/\` is already refused by `isPlainAscii`). */
function isSingleSlashPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//')
}

/**
 * The raw value plus each decoded form, or `null` when a round fails (malformed `%`), or the value is still changing
 * after the last round (stacked encoding).
 */
function decodedForms(value: string): string[] | null {
  const forms = [value]
  let current = value
  for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      return null
    }
    if (next === current) return forms
    forms.push(next)
    current = next
  }
  return null
}

function isBlockedPath(pathname: string): boolean {
  const lower = pathname.toLowerCase()
  return BLOCKED_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`))
}

function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/**
 * The validated same-site redirect path (`pathname + search`), or `undefined` when `value` is unsafe or is not a page
 * of this site. Callers fall back to a default landing (the role landing, ARCH-001 12.4).
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_REDIRECT_LENGTH) return undefined
  if (!isPlainAscii(value) || !isSingleSlashPath(value)) return undefined

  const forms = decodedForms(value)
  if (forms === null) return undefined
  for (const form of forms) {
    // Decoded controls, whitespace, backslashes or non-ASCII (`%09`, `%5c`, `%e2%80%a8`) mean an encoded attack.
    if (!isPlainAscii(form) || !isSingleSlashPath(form) || SCHEME_MARKER.test(form)) return undefined
  }

  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return undefined
  }
  if (url.origin !== BASE_ORIGIN || url.username !== '' || url.password !== '') return undefined
  const { pathname, search } = url
  if (!isSingleSlashPath(pathname)) return undefined

  // Dot segments are resolved by the parser (`/app/../api` becomes `/api`), so check the parsed path, raw and decoded.
  const decodedPath = decodedForms(pathname)?.at(-1)
  if (decodedPath === undefined || isBlockedPath(pathname) || isBlockedPath(decodedPath)) return undefined

  // Allow-list: only paths that a registry route serves (F-20). Unknown paths would 404 anyway.
  if (resolveRoute(withoutTrailingSlash(pathname)) === undefined) return undefined

  const result = `${pathname}${search}`
  return result.length > MAX_REDIRECT_LENGTH ? undefined : result
}

/** `/login`, carrying the return-to path when it is safe. */
export function loginPath(returnTo: unknown): string {
  const safe = safeRedirect(returnTo)
  return safe === undefined ? '/login' : `/login?${new URLSearchParams({ returnTo: safe }).toString()}`
}
