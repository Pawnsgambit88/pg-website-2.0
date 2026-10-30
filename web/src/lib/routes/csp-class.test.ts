import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CLIENT_PATH_MATCHERS,
  PUBLIC_PATH_PATTERNS,
  isApiPath,
  matchingClasses,
  patternToRegExp,
  proxyMatches,
} from './csp-class.ts'
import { ROUTES, SERVER_ENDPOINTS, type RouteDef } from './routes.ts'

// Concrete sample for a pattern: every dynamic segment becomes a valid value.
function sample(pattern: string): string {
  return pattern.replace(/\[(\w+)\]/g, (_, name: string) => (name === 'tab' ? 'overview' : 'sample-1'))
}

describe('CSP route classes (ARCH-001 10.3, feeds TASK-120)', () => {
  it('assigns every registered page to exactly one class, matching the registry', () => {
    for (const route of ROUTES) {
      expect(matchingClasses(sample(route.pattern)), route.pattern).toEqual([route.csp])
    }
  })

  it('keeps the public and client pattern sets mutually exclusive over every known path', () => {
    const paths = [
      ...(ROUTES as readonly RouteDef[]).flatMap((route) => [
        sample(route.pattern),
        ...Object.values(route.expand ?? {}).flat(),
      ]),
      ...SERVER_ENDPOINTS.map((endpoint) => endpoint.pattern),
      '/_not-found',
      '/events/x/register',
      '/events/x',
      '/app',
      '/admin/anything/deep/er',
    ]
    for (const path of paths) expect(matchingClasses(path).length, path).toBeLessThanOrEqual(1)
  })

  it('has no pattern shared by the two sets', () => {
    const client = new Set<string>(CLIENT_PATH_MATCHERS)
    expect(PUBLIC_PATH_PATTERNS.filter((pattern) => client.has(pattern))).toEqual([])
  })

  it('treats /events/[slug]/register as client and /events/[slug] as public', () => {
    expect(matchingClasses('/events/spring-open')).toEqual(['public'])
    expect(matchingClasses('/events/spring-open/register')).toEqual(['client'])
    expect(proxyMatches('/events/spring-open')).toBe(false)
    expect(proxyMatches('/events/spring-open/register')).toBe(true)
    // A look-alike must not slip into either class.
    expect(matchingClasses('/events/spring-open/registered')).toEqual([])
    expect(matchingClasses('/events/a/b/register')).toEqual([])
  })

  it('includes bare group roots in the client matchers', () => {
    for (const path of ['/app', '/admin', '/handoff', '/auth/callback', '/login', '/welcome', '/reset-password']) {
      expect(proxyMatches(path), path).toBe(true)
    }
  })

  it('never lets the proxy match /api/*, including encoded and slash variants', () => {
    const apiPaths = [
      '/api',
      '/api/',
      '/api/revalidate',
      '/api/revalidate/',
      '/api/draft',
      '/api/draft/',
      '/api/draft/exit',
      '/api/csp-report',
      '/api/events',
      '/api/auth/login',
      '/api/%2e%2e/admin',
      '/api/../admin',
      '/api//admin',
    ]
    for (const path of apiPaths) {
      expect(isApiPath(path), path).toBe(true)
      expect(proxyMatches(path), path).toBe(false)
      expect(matchingClasses(path), path).toEqual([])
    }
    // The page group named "app" is not an API path.
    expect(isApiPath('/app')).toBe(false)
    expect(isApiPath('/apiary')).toBe(false)
  })

  it('anchors patterns: no prefix or suffix leakage', () => {
    expect(patternToRegExp('/play').test('/play-more')).toBe(false)
    expect(patternToRegExp('/play').test('/x/play')).toBe(false)
    expect(patternToRegExp('/app/:path*').test('/application')).toBe(false)
    expect(patternToRegExp('/app/:path*').test('/app')).toBe(true)
    expect(patternToRegExp('/app/:path*').test('/app/events/1')).toBe(true)
    expect(patternToRegExp('/').test('/')).toBe(true)
  })
})

// Nothing created for this task may intercept /api/*. TASK-013 owns no proxy.ts, middleware or rewrite (TASK-120 owns
// the proxy and its matcher), and the only route handlers under app/api are filesystem handlers, which Next serves before
// any `afterFiles` rewrite. A request-level assertion (a real server answering /api/revalidate locally while
// /api/events goes to the rewrite) needs a running Next server: recorded for TASK-009 / TASK-120 Playwright.
describe('/api/* is not intercepted by the route skeleton', () => {
  const srcRoot = join(process.cwd(), 'src')

  it('has no middleware.ts and no page or layout under app/api', () => {
    const entries = readdirSync(srcRoot)
    expect(entries).not.toContain('middleware.ts')
    const apiDir = join(srcRoot, 'app', 'api')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else files.push(name)
      }
    }
    try {
      walk(apiDir)
    } catch {
      // No app/api yet: nothing can intercept.
    }
    expect(files.filter((name) => /^(page|layout|template|loading|error|not-found)\./.test(name))).toEqual([])
    // Only route handlers may exist there.
    for (const name of files) expect(name, name).toMatch(/^route\.ts$/)
  })

  it('keeps group layouts and boundaries out of the /api namespace', () => {
    for (const route of ROUTES) expect(route.pattern.startsWith('/api'), route.pattern).toBe(false)
  })

  it('declares /api/* handlers as csp "none", outside both classes', () => {
    for (const endpoint of SERVER_ENDPOINTS.filter((e) => e.pattern.startsWith('/api'))) {
      expect(endpoint.csp, endpoint.pattern).toBe('none')
    }
    expect(readFileSync(join(srcRoot, 'lib', 'routes', 'csp-class.ts'), 'utf8')).toContain('isApiPath')
  })
})
