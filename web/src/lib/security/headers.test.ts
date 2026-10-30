import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { CLIENT_PATH_MATCHERS, PUBLIC_PATH_PATTERNS, matchingClasses } from '@/lib/routes/csp-class'
import { ROUTES, type RouteDef } from '@/lib/routes/routes'
import { readCspConfig } from './csp.ts'
import { buildHeaderRules, permissionsPolicy, toNextSource, unknownPathSource } from './headers.ts'

// Next compiles header sources with its vendored path-to-regexp (case-insensitive, delimiter "/"). Using the same
// library here means the exclusivity proof is about what Next will actually do, not about a re-implementation.
const require = createRequire(import.meta.url)
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp') as {
  pathToRegexp: (path: string, keys: unknown[], options: { delimiter: string; sensitive: boolean }) => RegExp
}
const compile = (source: string) => pathToRegexp(source, [], { delimiter: '/', sensitive: false })

const CSP_KEYS = new Set(['content-security-policy', 'content-security-policy-report-only'])
const prod = { VERCEL_ENV: 'production' }
const rules = (env: Record<string, string | undefined> = prod) => buildHeaderRules(readCspConfig(env), env)
const cspRules = (env?: Record<string, string | undefined>) =>
  rules(env)
    .filter((rule) => rule.headers.some((h) => CSP_KEYS.has(h.key.toLowerCase())))
    .map((rule) => ({ rule, regexp: compile(rule.source) }))

const sample = (pattern: string) =>
  pattern
    .replace(/\[(\w+)\]/g, 'x')
    .replace(/:path\*/, 'a/b')
    .replace(/:(\w+)/g, 'x')

describe('header rule exclusivity (SEC-001 F-05)', () => {
  const rulesWithCsp = cspRules()

  const pagePaths = (ROUTES as readonly RouteDef[]).flatMap((route) => [
    sample(route.pattern),
    ...Object.values(route.expand ?? {}).flat(),
  ])
  const extra = [
    '/sitemap.xml',
    '/robots.txt',
    '/_not-found',
    '/nope',
    '/a/b/c',
    '/events/x/registered',
    '/events/a/b/register',
    '/Play',
  ]

  it('puts exactly one CSP rule on every public page and metadata file', () => {
    for (const path of [...pagePaths, ...extra].filter((p) => matchingClasses(p)[0] === 'public')) {
      expect(rulesWithCsp.filter((r) => r.regexp.test(path)).length, path).toBe(1)
    }
  })

  it('puts NO CSP rule on any client path (the proxy owns them)', () => {
    const clientPaths = [...pagePaths, '/app', '/admin', '/handoff', '/events/spring/register'].filter(
      (p) => matchingClasses(p)[0] === 'client',
    )
    expect(clientPaths.length).toBeGreaterThan(20)
    for (const path of clientPaths) {
      expect(
        rulesWithCsp.filter((r) => r.regexp.test(path)).map((r) => r.rule.source),
        path,
      ).toEqual([])
    }
  })

  it('gives /api/* the default-deny baseline, once', () => {
    for (const path of ['/api/csp-report', '/api/revalidate', '/api/auth/login', '/api/x/y/z']) {
      const hits = rulesWithCsp.filter((r) => r.regexp.test(path))
      expect(hits, path).toHaveLength(1)
      expect(hits[0]?.rule.headers[0]?.value, path).toBe(
        "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      )
    }
  })

  it('covers unknown paths with the public policy (they render /_not-found), once, but not /_next', () => {
    for (const path of ['/nope', '/a/b/c', '/events/x/registered', '/events/a/b/register', '/appx', '/play/extra']) {
      const hits = rulesWithCsp.filter((r) => r.regexp.test(path))
      expect(hits, path).toHaveLength(1)
      expect(hits[0]?.rule.headers[0]?.value, path).toContain("'unsafe-inline'")
    }
    for (const path of ['/_next/static/chunks/a.js', '/_next/image']) {
      expect(rulesWithCsp.filter((r) => r.regexp.test(path)).length, path).toBe(0)
    }
  })

  it('never lists a client matcher as a CSP header source', () => {
    // The register page also has a Permissions-Policy-only rule; that carries no CSP, which is what matters here.
    const sources = new Set(rulesWithCsp.map((r) => r.rule.source))
    for (const matcher of CLIENT_PATH_MATCHERS) expect(sources.has(matcher), matcher).toBe(false)
    expect(sources.has(unknownPathSource())).toBe(true)
  })

  it('has one rule per public pattern, in Next syntax', () => {
    const sources = rules().map((r) => r.source)
    for (const pattern of PUBLIC_PATH_PATTERNS) expect(sources, pattern).toContain(toNextSource(pattern))
    expect(toNextSource('/events/[slug]')).toBe('/events/:slug')
  })
})

describe('header content', () => {
  const find = (list: ReturnType<typeof rules>, source: string) => list.find((r) => r.source === source)
  const values = (source: string, env?: Record<string, string | undefined>) =>
    Object.fromEntries((find(rules(env), source)?.headers ?? []).map((h) => [h.key, h.value]))

  it('sets the common security headers on every path, HSTS only in production', () => {
    const production = values('/:path*')
    expect(production).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    })
    expect(production).not.toHaveProperty('X-Robots-Tag')
    const preview = values('/:path*', { VERCEL_ENV: 'preview' })
    expect(preview).not.toHaveProperty('Strict-Transport-Security')
    expect(preview['X-Robots-Tag']).toBe('noindex, nofollow')
    expect(values('/:path*', {})).not.toHaveProperty('Strict-Transport-Security')
  })

  it('denies payment everywhere except the registration page', () => {
    expect(values('/:path*')['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()')
    expect(values('/events/:slug/register')['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=(self)',
    )
    expect(permissionsPolicy(true, true)).toContain('payment=(self "https://checkout.razorpay.com")')
    expect(permissionsPolicy(true, false)).toContain('payment=()')
  })

  it('ships Report-Only only from the staging flag and never on production', () => {
    const header = (env: Record<string, string | undefined>) =>
      cspRules(env).flatMap((r) => r.rule.headers.map((h) => h.key.toLowerCase()).filter((k) => CSP_KEYS.has(k)))
    expect(new Set(header({ VERCEL_ENV: 'preview', NEXT_PUBLIC_CSP_REPORT_ONLY: 'true' }))).toEqual(
      new Set(['content-security-policy-report-only']),
    )
    expect(new Set(header({ VERCEL_ENV: 'production', NEXT_PUBLIC_CSP_REPORT_ONLY: 'true' }))).toEqual(
      new Set(['content-security-policy']),
    )
    expect(new Set(header({}))).toEqual(new Set(['content-security-policy']))
  })

  it('sends exactly one CSP header per rule and a Reporting-Endpoints header with each public policy', () => {
    for (const { rule } of cspRules()) {
      expect(rule.headers.filter((h) => CSP_KEYS.has(h.key.toLowerCase()))).toHaveLength(1)
    }
    const publicRule = find(rules(), '/play')
    expect(publicRule?.headers.map((h) => h.key)).toContain('Reporting-Endpoints')
  })
})
