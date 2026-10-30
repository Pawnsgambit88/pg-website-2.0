import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './helpers/axe'
import { expectSingleCspHeader } from './helpers/csp'
import { withReducedMotion } from './helpers/emulation'
import { expectNoHorizontalScroll } from './helpers/horizontal-scroll'
import { requestLog } from './helpers/request-log'
import { expectTouchTargets } from './helpers/touch-targets'

// TASK-009 smoke. Runs once per viewport project (1440, 1280, 1024, 768, 390, 320 on Chromium; 1440 and 390 on WebKit).
//
// HONESTY NOTE (scaffold): /, /login, /app and /admin are TASK-007 placeholders. Each is an <h1> and one paragraph, with
// no links, controls, images or layout. So:
//   - the no-overflow, touch-target and axe checks pass TRIVIALLY today. They prove the harness runs end to end (the
//     self-tests in helpers.selftest.spec.ts prove each helper CAN fail), not that the product is responsive or
//     accessible. They start to carry weight as the real screens land (TASK-013 onwards).
//   - the touch-target assertion pins `checked === 0` so that the day a control appears the test says so and someone
//     decides what the right assertion is, instead of the check silently starting to mean something.
// Tag: @smoke selects the PR set (OPS-002 4.3), `npm run e2e -- --grep @smoke`.

const PLACEHOLDER_ROUTES = [
  { path: '/', heading: 'Home' },
  { path: '/login', heading: 'Login' },
  { path: '/app', heading: /./ },
  { path: '/admin', heading: /./ },
] as const

test.describe('placeholder routes @smoke', () => {
  for (const route of PLACEHOLDER_ROUTES) {
    test(`${route.path} renders and passes the shared checks`, async ({ page, baseURL }) => {
      const log = requestLog(page)
      const response = await page.goto(route.path)

      // The route exists and serves a page (unauthenticated /app and /admin are not guarded yet: TASK-013 onwards).
      expect(response?.status(), `${route.path} status`).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)

      // Trivially true for a placeholder; see the note at the top of the file.
      await expectNoHorizontalScroll(page)
      const { checked } = await expectTouchTargets(page)
      expect(checked, 'placeholder has no interactive elements; revisit this assertion when it gains some').toBe(0)
      const { rulesPassed } = await expectNoAxeViolations(page)
      expect(rulesPassed, 'axe must actually have evaluated rules').toBeGreaterThan(10)

      // Not trivial: holds for every page that ships (fonts self-hosted, no stock photos, one origin).
      log.expectNoForbiddenHosts()
      log.expectSameOriginOnly(new URL(baseURL ?? page.url()).host)
      expect(
        log.count((e) => e.resourceType === 'document'),
        'one document request, no redirect chain',
      ).toBe(1)

      // Exactly one CSP header (ARCH-001 10.5 step 1; TASK-120 landed). The full crawl is in prerender.raw.spec.ts.
      if (response) await expectSingleCspHeader(response)
    })
  }

  test('reduced motion is honoured by the emulation helper', async ({ page }) => {
    await withReducedMotion(page)
    await page.goto('/')
    const reduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    expect(reduced).toBe(true)
  })

  test('viewport project is the size it claims to be', async ({ page }, testInfo) => {
    // Guards the config itself: a typo in a project would otherwise make "six viewports" quietly mean fewer.
    const expectedWidth = Number(/-(\d+)$/.exec(testInfo.project.name)?.[1])
    await page.goto('/')
    const width = await page.evaluate(() => document.documentElement.clientWidth)
    // Desktop browsers may reserve a scrollbar gutter; mobile emulation does not.
    expect(Math.abs(width - expectedWidth)).toBeLessThanOrEqual(20)
  })
})
