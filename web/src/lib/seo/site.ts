// Site identity and URL helpers for the SEO layer (TASK-112, ARCH-001 8.1 to 8.3). Pure, no directive: safe on the
// server and in the browser (the builder preview in TASK-081 reuses it). The origin is NEXT_PUBLIC_SITE_URL, the same
// value the root layout uses for `metadataBase`, so canonical, Open Graph, JSON-LD and sitemap URLs cannot disagree.
import { envPublic } from '@/lib/env/env.public'

export const SITE_NAME = "Pawn's Gambit"

/** Mirrors `title.template` in app/layout.tsx (`%s | Pawn's Gambit`). Used where Next does not apply the template. */
export const TITLE_SEPARATOR = ' | '

/** Open Graph locale (ARCH-001 8.1). */
export const SITE_LOCALE = 'en_IN'

/** Open Graph card size (ARCH-001 8.3). */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const

/** The generated brand card at app/opengraph-image.tsx, used when a page has no image of its own. */
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image'
export const DEFAULT_OG_IMAGE_ALT = "Pawn's Gambit, social chess in Hyderabad"

/** Absolute site origin without a trailing slash, for example `https://pawnsgambit.in`. */
export function siteOrigin(): string {
  return envPublic.SITE_URL
}

/** The full document title for a page title: `Play | Pawn's Gambit`. */
export function fullTitle(title: string): string {
  return `${title}${TITLE_SEPARATOR}${SITE_NAME}`
}

// A same-origin path: starts with one slash, no backslash, no whitespace or control characters.
const SAME_ORIGIN_PATH = /^\/(?![/\\])[^\s\\]*$/

/**
 * Absolute URL for a same-origin path (`/events/x` -> `{SITE_URL}/events/x`) or an absolute `https:` URL (media from
 * the storage host, already allow-listed by the DTO schema). Anything else (protocol-relative, `http:`, `javascript:`,
 * relative without a slash) is `null`, so a builder omits the field instead of emitting a bad URL (EC-02).
 */
export function absoluteUrl(pathOrUrl: string): string | null {
  if (SAME_ORIGIN_PATH.test(pathOrUrl)) return `${siteOrigin()}${pathOrUrl}`
  if (!pathOrUrl.startsWith('https://')) return null
  try {
    return new URL(pathOrUrl).href
  } catch {
    return null
  }
}

/**
 * Canonical absolute URL for a route path. The path must be same-origin and carry no query or fragment (canonical URLs
 * never do). A trailing slash is removed except on `/`. Throws on a bad path: that is a programming error in a page.
 */
export function canonicalUrl(path: string): string {
  if (!SAME_ORIGIN_PATH.test(path) || /[?#]/.test(path)) {
    throw new Error(`canonicalUrl: expected a same-origin path without query or fragment, got "${path}"`)
  }
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  return `${siteOrigin()}${trimmed === '' ? '/' : trimmed}`
}
