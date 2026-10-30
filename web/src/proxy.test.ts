import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { CLIENT_PATH_MATCHERS, isApiPath, matchingClasses, proxyMatches } from '@/lib/routes/csp-class'
import { ROUTES } from '@/lib/routes/routes'
import { NONCE_HEADER } from '@/lib/security/csp'
import { config, proxy } from './proxy.ts'

const call = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(new URL(path, 'https://pg.example'), { headers }))

const sample = (pattern: string) => pattern.replace(/\[(\w+)\]/g, 'x')

describe('proxy matcher', () => {
  it('lists exactly CLIENT_PATH_MATCHERS, in order, and nothing else', () => {
    expect(config.matcher.map((entry) => entry.source)).toEqual([...CLIENT_PATH_MATCHERS])
  })

  it('skips prefetch requests on every entry', () => {
    for (const entry of config.matcher) {
      expect(entry.missing.map((m) => m.key)).toEqual(['next-router-prefetch', 'purpose'])
    }
  })

  it('never matches /api/*, static files or public pages', () => {
    for (const path of [
      '/api/csp-report',
      '/api/revalidate',
      '/api/auth/login',
      '/_next/static/a.js',
      '/favicon.ico',
      '/',
      '/play',
      '/events/x',
      '/sitemap.xml',
      '/robots.txt',
    ]) {
      expect(proxyMatches(path), path).toBe(false)
    }
  })
})

describe('proxy behaviour', () => {
  it('adds a nonce CSP, x-nonce, Reporting-Endpoints and noindex on every client route', () => {
    for (const route of ROUTES.filter((r) => r.csp === 'client')) {
      const path = sample(route.pattern)
      const response = call(path)
      const csp = response.headers.get('content-security-policy')
      expect(csp, path).toContain("'strict-dynamic'")
      expect(response.headers.get('content-security-policy-report-only'), path).toBeNull()
      expect(response.headers.get('x-robots-tag'), path).toBe('noindex, nofollow')
      expect(response.headers.get('reporting-endpoints'), path).toBe('csp-endpoint="/api/csp-report"')
      // The nonce handed to Next on the request is the nonce in the response header.
      const forwarded = response.headers.get(`x-middleware-request-${NONCE_HEADER}`)
      expect(forwarded, path).toMatch(/^[A-Za-z0-9+/]{22}==$/)
      expect(csp, path).toContain(`'nonce-${forwarded}'`)
      expect(response.headers.get('x-middleware-request-content-security-policy'), path).toBe(csp)
    }
  })

  it('uses a fresh nonce per request', () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => call('/login').headers.get(`x-middleware-request-${NONCE_HEADER}`)),
    )
    expect(nonces.size).toBe(50)
  })

  it('overwrites a forged inbound CSP or nonce header', () => {
    const response = call('/login', { 'content-security-policy': "script-src 'unsafe-inline'", 'x-nonce': 'forged' })
    expect(response.headers.get('x-middleware-request-x-nonce')).not.toBe('forged')
    const forwarded = response.headers.get('x-middleware-request-content-security-policy') ?? ''
    expect(forwarded).toContain("'strict-dynamic'")
    expect(forwarded).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  it('passes /api/* and public pages through untouched (no CSP, no nonce, no robots header)', () => {
    for (const path of [
      '/api/csp-report',
      '/api/revalidate',
      '/api/draft/exit',
      '/',
      '/events/x',
      '/_not-found',
      '/unknown',
    ]) {
      const response = call(path)
      expect(response.headers.get('content-security-policy'), path).toBeNull()
      expect(response.headers.get('content-security-policy-report-only'), path).toBeNull()
      expect(response.headers.get('x-robots-tag'), path).toBeNull()
      expect(response.headers.get(`x-middleware-request-${NONCE_HEADER}`), path).toBeNull()
    }
  })

  it('agrees with the route classes: a path is handled iff it is in the client class', () => {
    for (const route of ROUTES) {
      const path = sample(route.pattern)
      const handled = call(path).headers.get('content-security-policy') !== null
      expect(handled, path).toBe(matchingClasses(path)[0] === 'client')
    }
    expect(isApiPath('/api/csp-report')).toBe(true)
  })
})
