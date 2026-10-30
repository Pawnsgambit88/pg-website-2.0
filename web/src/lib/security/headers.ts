// Static response headers for next.config.ts `headers()` (TASK-120, ARCH-001 10.3 / 18.1, SEC-001 F-05).
// Imported by next.config.ts through a relative `.ts` path, so: no `@/` alias, no `server-only`, no process access here.
//
// CSP delivery (exactly one CSP header per response, ARCH-001 10.5 step 1):
//   public   PUBLIC_PATH_PATTERNS            -> static public policy   (this file, from next.config)
//   client   CLIENT_PATH_MATCHERS            -> nonce policy           (src/proxy.ts; deliberately NOT matched here)
//   api      /api/*                          -> default-deny baseline  (handlers and the Railway rewrite; no page renders)
//   unknown  everything else except /_next  -> static public policy    (the request renders the global /_not-found,
//                                              which is in the public class; the baseline would block its inline scripts)
// The four rules are mutually exclusive by construction: the `unknown` rule is a negative lookahead built from the very
// same pattern lists, so a new public or client pattern can never end up with two policies (F-05).
// eslint-disable-next-line no-restricted-imports -- next.config.ts imports this module natively (no @/ alias resolution at config load)
import { CLIENT_PATH_MATCHERS, PUBLIC_PATH_PATTERNS } from '../routes/csp-class.ts'
import {
  REPORTING_ENDPOINTS_VALUE,
  baselineCspHeader,
  publicCspHeader,
  type CspConfig,
  type CspHeader,
  type CspEnv,
  isProductionTarget,
} from './csp.ts'

export interface HeaderRule {
  readonly source: string
  readonly headers: readonly { readonly key: string; readonly value: string }[]
}

const REGEXP_SPECIALS = /[.*+?^${}()|\\]/g
const PLAIN_SEGMENT = /^[A-Za-z0-9_.~-]+$/

/** `[slug]` (registry syntax) to `:slug` (Next header/proxy syntax). `:param*` and `:param` pass through. */
export function toNextSource(pattern: string): string {
  return pattern.replace(/\[(\w+)\]/g, ':$1')
}

/** One pattern as a regex fragment matching the path WITHOUT its leading slash, for use inside a lookahead. */
function lookaheadFragment(pattern: string): string {
  const segments = pattern.split('/').filter((segment) => segment !== '')
  if (segments.length === 0) return ''
  let source = ''
  segments.forEach((raw, index) => {
    const segment = toNextSource(raw)
    const separator = index === 0 ? '' : '/'
    if (/^:[A-Za-z]\w*\*$/.test(segment)) source += `(?:${separator}.*)?`
    else if (/^:[A-Za-z]\w*$/.test(segment)) source += `${separator}[^/]+`
    else {
      if (!PLAIN_SEGMENT.test(segment)) throw new Error(`Unsupported segment "${segment}" in CSP pattern "${pattern}".`)
      source += `${separator}${segment.replace(REGEXP_SPECIALS, '\\$&')}`
    }
  })
  return source
}

/**
 * `source` for the unknown-path rule: any path that is not public, not client, not /api and not /_next. Next compiles
 * header sources with path-to-regexp, so the lookahead sits inside a custom-regexp param. The root path is public.
 */
export function unknownPathSource(): string {
  const excluded = [
    ...PUBLIC_PATH_PATTERNS.map(lookaheadFragment),
    ...CLIENT_PATH_MATCHERS.map(lookaheadFragment),
    'api(?:/.*)?',
    '_next(?:/.*)?',
  ].filter((fragment) => fragment !== '')
  return `/:path((?!(?:${excluded.join('|')})$).+)`
}

export function permissionsPolicy(razorpay: boolean, pathIsRegister: boolean): string {
  // payment is granted only on the registration page (and, with Razorpay on, to its checkout frame). Everything else denies it.
  const payment = pathIsRegister
    ? razorpay
      ? 'payment=(self "https://checkout.razorpay.com")'
      : 'payment=(self)'
    : 'payment=()'
  return `camera=(), microphone=(), geolocation=(), ${payment}`
}

/**
 * The ordered rule list for `headers()`. Rules that set different header names may overlap freely (Next applies all
 * matches; for the same key the last rule wins, which `register` uses for Permissions-Policy and `/reset-password` for
 * Referrer-Policy). CSP rules never overlap.
 */
export function buildHeaderRules(config: CspConfig, env: CspEnv): HeaderRule[] {
  const production = isProductionTarget(env)
  const common: HeaderRule['headers'] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: permissionsPolicy(config.razorpay, false) },
    // Google sign-in popup and Razorpay compatible (ARCH-001 10.3).
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    { key: 'X-Frame-Options', value: 'DENY' },
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : // Preview, staging and local deployments are never indexable (ARCH-001 18.1).
        [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
  ]

  const toHeader = (header: CspHeader) => ({ key: header.name, value: header.value })
  const reporting = { key: 'Reporting-Endpoints', value: REPORTING_ENDPOINTS_VALUE }
  const publicPolicy = [toHeader(publicCspHeader(config)), reporting]

  return [
    { source: '/:path*', headers: common },
    {
      source: '/events/:slug/register',
      headers: [{ key: 'Permissions-Policy', value: permissionsPolicy(config.razorpay, true) }],
    },
    // The reset link carries a one-time token in `?token=` until the page strips it: never send it as a Referer (TASK-053).
    { source: '/reset-password', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
    ...PUBLIC_PATH_PATTERNS.map((pattern) => ({ source: toNextSource(pattern), headers: publicPolicy })),
    { source: '/api/:path*', headers: [toHeader(baselineCspHeader(config))] },
    { source: unknownPathSource(), headers: publicPolicy },
  ]
}
