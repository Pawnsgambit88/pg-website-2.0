import type Link from 'next/link'
import type { ComponentProps } from 'react'

/**
 * What `next/link` accepts. With `typedRoutes` this makes a typo in an internal path a compile error, while absolute
 * URLs (`https://`, `mailto:`, `tel:`) stay allowed.
 */
export type LinkHref = ComponentProps<typeof Link>['href']

/**
 * internal  same-origin path, query or hash: rendered with `next/link`
 * external  absolute http(s), mailto or tel: rendered as a plain `<a>` (no client router)
 * unsafe    anything else (`javascript:`, `data:`, protocol-relative `//host`, empty): never rendered as a link
 */
export type LinkKind = 'internal' | 'external' | 'unsafe'

const EXTERNAL_PATTERN = /^(?:https?:\/\/|mailto:|tel:)/i
const WEB_URL_PATTERN = /^https?:\/\//i

// Whitespace, C0/C1 control characters and backslashes never belong in a link (also defeats `java<TAB>script:` tricks).
// Compared by code so the source stays ASCII and needs no control-character regex.
function hasForbiddenCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x5c) return true
  }
  return false
}

/**
 * Link policy for data-driven hrefs (CMS links, DTO urls): http(s), mailto and tel plus site paths only
 * (rules/40-frontend.mdc Security). Kept free of zod so a Button on a static page does not pull the schema library.
 */
export function classifyHref(href: LinkHref): LinkKind {
  // Url objects (`{ pathname, query }`) are developer-built, not data: always internal navigation.
  if (typeof href !== 'string') return 'internal'
  if (href.length === 0 || hasForbiddenCharacter(href)) return 'unsafe'
  if (EXTERNAL_PATTERN.test(href)) return 'external'
  if (href.startsWith('//')) return 'unsafe'
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return 'internal'
  return 'unsafe'
}

/** Absolute http(s) links leave the site: they get `noopener noreferrer`. mailto and tel need no rel. */
export function isWebUrl(href: LinkHref): boolean {
  return typeof href === 'string' && WEB_URL_PATTERN.test(href)
}
