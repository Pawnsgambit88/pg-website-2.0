// CSP route classes (ARCH-001 10.3). Feeds TASK-120: next.config `headers()` (public class) and `src/proxy.ts`
// (client class). Both pattern sets are built here so they cannot drift, and csp-class.test.ts proves they are mutually
// exclusive. `/api/*` belongs to neither class: the proxy must never match it (the Vercel rewrite forwards it to
// Railway; `/api/revalidate` and friends are filesystem route handlers that win over the rewrite).
import { ROUTES, SERVER_ENDPOINTS, type CspClass } from './routes.ts'

/**
 * Proxy `matcher` entries for the `client` class, in Next matcher syntax (`:param`, `:param*`). Nothing else may be
 * added to the proxy matcher. `/app/:path*` and friends also match their bare root (`/app`).
 */
export const CLIENT_PATH_MATCHERS = [
  '/login',
  '/auth/:path*',
  '/reset-password',
  '/welcome',
  '/app/:path*',
  '/admin/:path*',
  '/handoff/:path*',
  '/events/:slug/register',
] as const

/**
 * Patterns of the `public` class: every public page, the crawl-surface metadata files and the global not-found
 * document. Derived from the registry so a new public page is covered automatically.
 */
export const PUBLIC_PATH_PATTERNS: readonly string[] = [
  ...ROUTES.filter((route) => route.csp === 'public').map((route) => route.pattern),
  ...SERVER_ENDPOINTS.filter((endpoint) => endpoint.csp === 'public').map((endpoint) => endpoint.pattern),
  '/_not-found',
]

const REGEXP_SPECIALS = /[.*+?^${}()|\\]/g

/**
 * Compiles a Next path pattern (`[slug]`) or proxy matcher (`:slug`, `:path*`) to an anchored RegExp.
 * Whole-path and case-sensitive, no trailing slash (Next redirects `/x/` to `/x` before any proxy or header rule).
 */
export function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => {
      if (/^:[A-Za-z]\w*\*$/.test(segment)) return '(?:/.*)?'
      if (/^:[A-Za-z]\w*$/.test(segment) || /^\[[A-Za-z]\w*\]$/.test(segment)) return '/[^/]+'
      return `/${segment.replace(REGEXP_SPECIALS, '\\$&')}`
    })
    .join('')
  return new RegExp(`^${source === '' ? '/' : source}$`)
}

const CLIENT_REGEXPS = CLIENT_PATH_MATCHERS.map(patternToRegExp)
const PUBLIC_REGEXPS = PUBLIC_PATH_PATTERNS.map(patternToRegExp)
const API_REGEXP = /^\/api(?:\/|$)/

/** True for any path under `/api`. These are never a page and never touched by the proxy. */
export function isApiPath(pathname: string): boolean {
  return API_REGEXP.test(pathname)
}

/**
 * Every class whose pattern set matches the path. Exactly one for a known page, none for `/api/*` and unknown paths.
 * More than one entry is a configuration bug (the exclusivity test fails on it).
 */
export function matchingClasses(pathname: string): CspClass[] {
  const classes: CspClass[] = []
  if (PUBLIC_REGEXPS.some((regexp) => regexp.test(pathname))) classes.push('public')
  if (CLIENT_REGEXPS.some((regexp) => regexp.test(pathname))) classes.push('client')
  return classes
}

/** Whether the proxy matcher would run for this path (client class only). */
export function proxyMatches(pathname: string): boolean {
  return CLIENT_REGEXPS.some((regexp) => regexp.test(pathname))
}
