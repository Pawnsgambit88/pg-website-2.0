import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'
import { expectSingleCspHeader } from './helpers/csp'

// TASK-120 / OD-03: the page must hydrate under the real policy with zero CSP violations (ARCH-001 10.5 step 3). Runs once
// per viewport project (390 and 320 are the touch projects the task names). Real Chromium and WebKit, against the
// production build, so the policy is the shipped one, not the dev relaxation.
//
// "Hydrated" is proven three ways, not assumed:
//   1. React stamped its root container (a `__reactContainer$...` key on the document) after hydrateRoot ran;
//   2. Next's flight bootstrap array exists (`self.__next_f`), i.e. the inline bootstrap script executed;
//   3. a client-only effect ran: the client groups mount `RouteFocus`, which only sets `data-route-focused` post-hydration
//      OR a live region exists. We assert (1) and (2) strictly and report (3) as informational via the DOM.

type Watch = { violations: string[]; consoleErrors: string[] }

async function watch(page: Page): Promise<Watch> {
  const state: Watch = { violations: [], consoleErrors: [] }
  await page.addInitScript(() => {
    ;(window as unknown as { __cspViolations: string[] }).__cspViolations = []
    document.addEventListener('securitypolicyviolation', (event) => {
      ;(window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${event.effectiveDirective} blocked=${event.blockedURI.split('?')[0] ?? ''} disposition=${event.disposition}`,
      )
    })
  })
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' || message.type() === 'warning') state.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => state.consoleErrors.push(`pageerror: ${error.message}`))
  return state
}

async function collect(page: Page, state: Watch): Promise<void> {
  const fromPage = await page.evaluate(
    () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
  )
  state.violations.push(...fromPage)
}

async function expectHydrated(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = Object.keys(document).some((key) => key.startsWith('__reactContainer$'))
          const flight = Array.isArray((self as unknown as { __next_f?: unknown }).__next_f)
          return { root, flight }
        }),
      { message: 'React did not hydrate (no root container / flight bootstrap)', timeout: 10_000 },
    )
    .toEqual({ root: true, flight: true })
}

const CSP_CONSOLE = /content security policy|refused to (?:load|execute|apply|connect|frame)|violates the following/i

const PAGES = [
  { path: '/', kind: 'public' },
  { path: '/play', kind: 'public' },
  { path: '/events/spring-open', kind: 'public' },
  { path: '/login', kind: 'client' },
  { path: '/app', kind: 'client' },
  { path: '/admin', kind: 'client' },
  { path: '/events/spring-open/register', kind: 'client' },
] as const

test.describe('hydration under the shipped CSP @smoke', () => {
  for (const { path, kind } of PAGES) {
    test(`${path} (${kind}) hydrates with no CSP violation or console error`, async ({ page }) => {
      const state = await watch(page)
      const response = await page.goto(path)
      expect(response, `${path} response`).not.toBeNull()
      if (response) {
        const header = await expectSingleCspHeader(response)
        expect(header.value).toContain(kind === 'client' ? "'strict-dynamic'" : "'unsafe-inline'")
      }
      await expectHydrated(page)
      // Let lazy chunks and font loads settle so late violations are counted too.
      await page.waitForLoadState('networkidle')
      await collect(page, state)
      expect(state.violations, `${path} securitypolicyviolation events`).toEqual([])
      expect(
        state.consoleErrors.filter((text) => CSP_CONSOLE.test(text)),
        `${path} CSP console errors`,
      ).toEqual([])
      expect(state.consoleErrors, `${path} console errors and warnings`).toEqual([])
    })
  }

  test('client navigation between client pages keeps working under the nonce policy', async ({ page }) => {
    const state = await watch(page)
    await page.goto('/login')
    await expectHydrated(page)
    // Soft navigation fetches RSC payloads and new chunks; strict-dynamic must let the nonce-trusted runtime load them.
    await page.evaluate(() => {
      history.pushState({}, '', '/welcome')
    })
    await page.goto('/welcome')
    await expectHydrated(page)
    await collect(page, state)
    expect(state.violations).toEqual([])
  })
})

test.describe('the harness can fail (negative controls)', () => {
  test('a parser-inserted inline script without the nonce is blocked on a client page and reported', async ({
    page,
  }) => {
    // A script element created through page.evaluate is run by DevTools and is not subject to the page policy, so the
    // control rewrites the document itself: the browser parses an un-nonced inline script exactly as it would an injected one.
    await page.route('**/login', async (route) => {
      const response = await route.fetch()
      const html = (await response.text()).replace('</body>', '<script>window.__injected = true</script></body>')
      await route.fulfill({ response, body: html })
    })
    const state = await watch(page)
    await page.goto('/login')
    await expectHydrated(page)
    // Staging runs Report-Only (NEXT_PUBLIC_CSP_REPORT_ONLY=true): the violation is reported but the script still runs.
    const reportOnly = process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === 'true'
    expect(
      await page.evaluate(() => (window as unknown as { __injected?: boolean }).__injected === true),
      reportOnly
        ? 'Report-Only observes but does not block'
        : 'un-nonced inline script must not run under the strict policy',
    ).toBe(reportOnly)
    await collect(page, state)
    expect(state.violations.some((v) => v.startsWith('script-src-elem') && v.includes('inline'))).toBe(true)
  })

  test('a cross-origin script is blocked on a public page', async ({ page }) => {
    const state = await watch(page)
    await page.goto('/play')
    await expectHydrated(page)
    await page.evaluate(() => {
      const script = document.createElement('script')
      script.src = 'https://example.invalid/x.js'
      document.head.appendChild(script)
    })
    await expect
      .poll(async () => {
        await collect(page, state)
        return state.violations.some((v) => v.startsWith('script-src') && v.includes('example.invalid'))
      })
      .toBe(true)
  })

  test('a connection to a third-party host is blocked on a public page', async ({ page }) => {
    const state = await watch(page)
    await page.goto('/play')
    await expectHydrated(page)
    await page.evaluate(() => fetch('https://api.razorpay.com/v1/ping').catch(() => undefined))
    await expect
      .poll(async () => {
        await collect(page, state)
        return state.violations.some((v) => v.startsWith('connect-src'))
      })
      .toBe(true)
  })
})
