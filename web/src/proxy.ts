// Edge policy for the `client` route class (TASK-120, ARCH-001 10.3 / DEC-005). Next 16 renamed `middleware` to `proxy`.
//
// Runs only for (auth), (app), (admin), (handoff) and /events/[slug]/register. Per request it:
//   1. creates a nonce and builds the strict CSP (lib/security/csp.ts, the only place CSP strings are built),
//   2. sets that CSP on the REQUEST so Next stamps the nonce on its framework scripts and styles, and exposes the nonce as
//      `x-nonce` for server components that need to pass it to a loader,
//   3. sets the same CSP, `Reporting-Endpoints` and `X-Robots-Tag: noindex, nofollow` on the RESPONSE (ARCH-001 17.4).
// Public pages never reach this file (static header from next.config.ts), so they stay prerendered and CDN-cacheable.
//
// The matcher below MUST stay an inline literal: Next statically analyses `config` and fails the build ("Invalid segment
// configuration export") on shared constants, imports or spreads, which is why the prefetch filter is repeated per entry. The unit test
// (proxy.test.ts) pins it to CLIENT_PATH_MATCHERS in lib/routes/csp-class.ts, which is the source of truth, and proves it
// never matches /api/*. Prefetch requests are skipped (they return a flight payload, not a document).
import { NextResponse, type NextRequest } from 'next/server'
import { isApiPath, matchingClasses } from '@/lib/routes/csp-class'
import {
  NONCE_HEADER,
  REPORTING_ENDPOINTS_VALUE,
  ROBOTS_NOINDEX_VALUE,
  clientCspHeader,
  createNonce,
  readCspConfig,
  type CspConfig,
} from '@/lib/security/csp'

// Computed once per server instance: pure environment reads, no per-request state (RBP server-no-shared-module-state:
// nothing here depends on the request, and the nonce is created inside the handler).
let cachedConfig: CspConfig | undefined
function cspConfig(): CspConfig {
  cachedConfig ??= readCspConfig(process.env)
  return cachedConfig
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Defence in depth: the matcher already excludes these. /api/* and anything outside the client class passes through
  // untouched so no second CSP header can appear on it.
  if (isApiPath(pathname)) return NextResponse.next()
  const classes = matchingClasses(pathname)
  if (classes.length !== 1 || classes[0] !== 'client') return NextResponse.next()

  const nonce = createNonce()
  const csp = clientCspHeader({ nonce, pathname, config: cspConfig() })

  // A browser cannot legitimately send these; overwrite so a forged inbound value never reaches the app.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('content-security-policy')
  requestHeaders.delete('content-security-policy-report-only')
  requestHeaders.set(csp.name, csp.value)
  requestHeaders.set(NONCE_HEADER, nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(csp.name, csp.value)
  response.headers.set('Reporting-Endpoints', REPORTING_ENDPOINTS_VALUE)
  response.headers.set('X-Robots-Tag', ROBOTS_NOINDEX_VALUE)
  return response
}

export const config = {
  matcher: [
    {
      source: '/login',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/auth/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/reset-password',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/welcome',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/app/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/admin/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/handoff/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/events/:slug/register',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
