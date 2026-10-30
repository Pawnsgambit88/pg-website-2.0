import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { cspHeaders, expectSingleCspHeader } from './helpers/csp'
import { expectRawContent, fetchRawHtml } from './helpers/raw-html'
import { ROUTES } from '../src/lib/routes/routes'

// Runs in the `raw-html` project only (JavaScript disabled; the `.raw.spec.ts` suffix selects it).
// ARCH-001 16.1 "Prerender/no-JS" and 10.5 step 1. Tagged @smoke: OPS-002 G9 lists no-JS and CSP assertions in the PR set.

test.describe('prerender without JavaScript @smoke', () => {
  test('/ contains its content in the HTML a crawler receives', async ({ request }) => {
    const raw = await fetchRawHtml(request, '/')
    expect(raw.status).toBe(200)
    expectRawContent(raw, { text: ['Home', 'Placeholder. The real page arrives with its feature task.'] })
    expect(raw.html).toMatch(/<html[^>]*\blang="en"/)
    expect(raw.html).toMatch(/<h1\b/)
  })

  test('/ is indexable and a client group is not (scaffold robots wiring)', async ({ request }) => {
    const home = await fetchRawHtml(request, '/')
    const login = await fetchRawHtml(request, '/login')
    // Local builds send X-Robots-Tag: noindex on every route (next.config.ts, non-production deployments), so the
    // meta tag is the discriminating signal here.
    expect(home.html).toMatch(/<meta name="robots" content="index, follow"/)
    expect(login.html).toMatch(/<meta name="robots" content="noindex, nofollow"/)
  })

  test('/ renders in a script-less browser too', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    // javaScriptEnabled is false for this project: the heading is visible without hydration.
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
  })

  test('every route in the build manifest carries exactly one CSP header (TASK-120, ARCH-001 10.5 step 1)', async ({
    request,
  }) => {
    const routes = crawlRoutes()
    expect(routes.length, 'route manifest produced no routes').toBeGreaterThan(30)
    for (const route of routes) {
      const response = await request.get(route, { maxRedirects: 0 })
      expect(response.status(), `${route} status`).toBeLessThan(500)
      const header = await expectSingleCspHeader(response)
      // Production is never Report-Only; the e2e build is enforcing unless the staging flag is set on purpose.
      if (process.env.NEXT_PUBLIC_CSP_REPORT_ONLY !== 'true') {
        expect(header.name.toLowerCase(), route).toBe('content-security-policy')
      }
      expect(header.value, route).not.toMatch(/unsafe-eval/)
      expect(header.value, route).toMatch(/object-src 'none'/)
      expect(header.value, route).toMatch(/frame-ancestors 'none'/)
    }
  })

  test('public pages carry the static policy and client pages the nonce policy', async ({ request }) => {
    const publicHeader = await expectSingleCspHeader(await request.get('/play'))
    expect(publicHeader.value).toContain("script-src 'self' 'unsafe-inline'")
    expect(publicHeader.value).not.toMatch(/nonce-|strict-dynamic/)
    const clientHeader = await expectSingleCspHeader(await request.get('/login'))
    expect(clientHeader.value).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/]{22}==' 'strict-dynamic'/)
    expect(clientHeader.value).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  test('nonce is fresh per request and matches the one stamped on the document', async ({ request }) => {
    const nonces = new Set<string>()
    for (let i = 0; i < 3; i += 1) {
      const response = await request.get('/login')
      const header = await expectSingleCspHeader(response)
      const nonce = /'nonce-([^']+)'/.exec(header.value)?.[1]
      expect(nonce).toBeTruthy()
      nonces.add(nonce ?? '')
      const html = await response.text()
      expect(html, 'framework scripts carry the header nonce').toContain(`nonce="${nonce}"`)
      // Under 'strict-dynamic' a host allow-list is ignored, so every <script> in the document needs the nonce.
      const tags = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0])
      expect(tags.length, 'document has scripts').toBeGreaterThan(0)
      expect(
        tags.filter((tag) => !tag.includes(`nonce="${nonce}"`)),
        'every <script> carries the request nonce',
      ).toEqual([])
    }
    expect(nonces.size).toBe(3)
  })

  test('client and /api routes carry the right companion headers', async ({ request }) => {
    const client = await request.get('/app')
    const headers = Object.fromEntries((await client.headersArray()).map((h) => [h.name.toLowerCase(), h.value]))
    expect(headers['x-robots-tag']).toBe('noindex, nofollow')
    expect(headers['reporting-endpoints']).toBe('csp-endpoint="/api/csp-report"')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('geolocation=()')
    const robots = (await client.headersArray()).filter((h) => h.name.toLowerCase() === 'x-robots-tag')
    expect(robots, 'exactly one X-Robots-Tag line').toHaveLength(1)

    const register = await request.get('/events/spring-open/register')
    const registerPolicy = Object.fromEntries(
      (await register.headersArray()).map((h) => [h.name.toLowerCase(), h.value]),
    )
    expect(registerPolicy['permissions-policy']).toContain('payment=(self')
    expect(headers['permissions-policy']).toContain('payment=()')
  })

  test('/api/csp-report is POST-only and always 204', async ({ request }) => {
    const report = JSON.stringify({
      'csp-report': {
        'document-uri': 'http://localhost/reset-password?token=SECRET',
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://evil.example/x.js?t=SECRET',
      },
    })
    const ok = await request.post('/api/csp-report', {
      data: report,
      headers: { 'content-type': 'application/csp-report' },
    })
    expect(ok.status()).toBe(204)
    expect(await ok.text()).toBe('')
    expect((await cspHeaders(ok)).length, 'baseline CSP only, never two').toBeLessThanOrEqual(1)
    const wrongType = await request.post('/api/csp-report', {
      data: report,
      headers: { 'content-type': 'application/json' },
    })
    expect(wrongType.status()).toBe(204)
    const oversize = await request.post('/api/csp-report', {
      data: 'x'.repeat(20_000),
      headers: { 'content-type': 'application/csp-report' },
    })
    expect(oversize.status()).toBe(204)
    expect((await request.get('/api/csp-report', { maxRedirects: 0 })).status()).toBe(405)
  })
})

/**
 * Every route in the Next build manifest (ARCH-001 10.5 step 1: "hit every route in the build manifest"), with dynamic
 * segments filled in, plus the cases the manifest cannot list: an unknown path (global not-found), an unknown event
 * slug and the CSP report endpoint. Falls back to the registry when the manifest is not readable (E2E_BASE_URL).
 */
function crawlRoutes(): string[] {
  let manifestRoutes: string[] = []
  try {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), '.next', 'app-path-routes-manifest.json'), 'utf8'),
    ) as Record<string, string>
    manifestRoutes = Object.values(manifest).filter((route) => route !== '/_not-found' && !route.startsWith('/_'))
  } catch {
    manifestRoutes = ROUTES.map((route) => route.pattern)
  }
  const filled = manifestRoutes
    .filter((route) => route !== '/api/csp-report')
    .map((route) => route.replace(/[(w+)]/g, (_, name: string) => (name === 'tab' ? 'overview' : 'spring-open')))
  return [
    ...new Set([
      ...filled,
      '/this-page-does-not-exist',
      '/events/unknown-slug/register',
      '/events/spring-open/registered',
    ]),
  ]
}
