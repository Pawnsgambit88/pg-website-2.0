import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from './helpers/axe'
import { expectNoDuplicateCspHeaders, expectSingleCspHeader, type HeaderSource } from './helpers/csp'
import { expectToFail } from './helpers/expect-failure'
import { expectNoHorizontalScroll } from './helpers/horizontal-scroll'
import { expectRawContent, fetchRawHtml, htmlToText } from './helpers/raw-html'
import { requestLog } from './helpers/request-log'
import { expectTouchTargets } from './helpers/touch-targets'

// TASK-009 acceptance: "helpers fail on deliberately broken fixtures". Each helper gets one fixture it must accept and
// one it must reject. Fixtures are inline HTML (page.setContent), so no server route or network is involved.
// Tagged @smoke so CI proves the helpers still bite before it trusts their green results.

const doc = (body: string, head = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>t</title>${head}</head><body>${body}</body></html>`

test.describe('helper self-tests @smoke', () => {
  test.describe('expectNoHorizontalScroll', () => {
    test('accepts a page that fits', async ({ page }) => {
      await page.setContent(doc('<main><h1>Fits</h1><p>short</p></main>'))
      await expectNoHorizontalScroll(page)
    })

    test('accepts a long unbroken name that wraps', async ({ page }) => {
      await page.setContent(doc(`<main style="overflow-wrap:anywhere"><p>${'W'.repeat(300)}</p></main>`))
      await expectNoHorizontalScroll(page)
    })

    test('rejects an element wider than the viewport and names it', async ({ page }) => {
      await page.setContent(doc('<main><div id="wide" style="width:3000px;height:10px">wide</div></main>'))
      await expectToFail(() => expectNoHorizontalScroll(page), /scrolls horizontally[\s\S]*div#wide/)
    })

    test('rejects a one pixel overflow', async ({ page }) => {
      await page.setContent(
        doc('<div style="width:calc(100vw + 1px);height:10px">x</div>', '<style>body{margin:0}</style>'),
      )
      await expectToFail(() => expectNoHorizontalScroll(page), /scrolls horizontally/)
    })
  })

  test.describe('expectTouchTargets', () => {
    test('accepts 44px controls and counts them', async ({ page }) => {
      await page.setContent(
        doc(
          '<button style="width:44px;height:44px">a</button><a href="/x" style="display:inline-block;width:60px;height:44px">b</a>',
        ),
      )
      expect((await expectTouchTargets(page)).checked).toBe(2)
    })

    test('rejects a 30px button and reports its size', async ({ page }) => {
      await page.setContent(doc('<button style="width:30px;height:30px">tiny</button>'))
      await expectToFail(() => expectTouchTargets(page), /button "tiny" is 30x30, needs 44/)
    })

    test('honours a stricter 48px override for inputs', async ({ page }) => {
      await page.setContent(doc('<input aria-label="name" style="width:200px;height:44px;box-sizing:border-box">'))
      await expectTouchTargets(page)
      await expectToFail(() => expectTouchTargets(page, { overrides: { input: 48 } }), /input .* is 200x44, needs 48/)
    })

    test('exempts an inline link inside running text but not a standalone one', async ({ page }) => {
      await page.setContent(doc('<p>Read the <a href="/terms">terms</a> before you join.</p>'))
      expect((await expectTouchTargets(page)).checked).toBe(0)
      await page.setContent(doc('<p><a href="/terms">terms</a></p>'))
      await expectToFail(() => expectTouchTargets(page), /a "terms"/)
    })

    test('ignores disabled and hidden controls', async ({ page }) => {
      await page.setContent(doc('<button disabled style="width:10px;height:10px">x</button><button hidden>y</button>'))
      expect((await expectTouchTargets(page)).checked).toBe(0)
    })
  })

  test.describe('expectNoAxeViolations', () => {
    test('accepts a labelled, well-structured page', async ({ page }) => {
      await page.setContent(
        doc('<main><h1>Title</h1><label>Name <input type="text" autocomplete="name"></label></main>'),
      )
      expect((await expectNoAxeViolations(page)).rulesPassed).toBeGreaterThan(10)
    })

    test('rejects an unlabelled input and an image without alt (critical)', async ({ page }) => {
      await page.setContent(
        doc('<main><h1>t</h1><input type="text"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main>'),
      )
      await expectToFail(() => expectNoAxeViolations(page), /critical image-alt|critical label/)
    })

    test('rejects insufficient colour contrast (serious)', async ({ page }) => {
      await page.setContent(doc('<main><h1>t</h1><p style="color:#bbb;background:#fff">faint text</p></main>'))
      await expectToFail(() => expectNoAxeViolations(page), /serious color-contrast/)
    })

    test('minImpact lets a caller choose the threshold', async ({ page }) => {
      // A page without a <main> landmark and with a skipped heading level yields moderate findings only.
      await page.setContent(doc('<h1>t</h1><h3>skipped</h3>'))
      await expectNoAxeViolations(page, { minImpact: 'serious' })
      await expectToFail(() => expectNoAxeViolations(page, { minImpact: 'moderate' }), /moderate/)
    })
  })

  test.describe('requestLog', () => {
    const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'
    const stub = (page: import('@playwright/test').Page) =>
      page.route(/^https:\/\/(?!example\.test)/, (route) =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
      )

    test('records requests, counts them, and passes when clean', async ({ page }) => {
      await stub(page)
      const log = requestLog(page)
      await page.route('https://example.test/**', (route) =>
        route.fulfill({ status: 200, body: 'ok', contentType: 'text/html' }),
      )
      await page.goto('https://example.test/')
      log.expectCount(/example\.test\/$/, 1)
      log.expectNoForbiddenHosts()
      log.expectSameOriginOnly('example.test')
      log.reset()
      expect(log.entries).toHaveLength(0)
    })

    test('flags Google Fonts', async ({ page }) => {
      await stub(page)
      await page.route('https://example.test/**', (route) =>
        route.fulfill({ status: 200, body: doc('<p>x</p>', fonts), contentType: 'text/html' }),
      )
      const log = requestLog(page)
      await page.goto('https://example.test/')
      await page.waitForLoadState('load')
      expect(() => log.expectNoForbiddenHosts()).toThrow(/fonts\.googleapis\.com/)
      expect(() => log.expectSameOriginOnly('example.test')).toThrow(/Requests outside example\.test/)
    })

    test('flags an extra forbidden host and a wrong count', async ({ page }) => {
      await page.route('https://example.test/**', (route) =>
        route.fulfill({ status: 200, body: doc('<p>x</p>'), contentType: 'text/html' }),
      )
      const log = requestLog(page)
      await page.goto('https://example.test/')
      expect(() => log.expectNoForbiddenHosts(['example.test'])).toThrow(/forbidden hosts/)
      expect(() => log.expectCount('example.test', 2, 'document')).toThrow(/expected 2 request\(s\), saw 1/)
    })
  })

  test.describe('CSP header assertions', () => {
    const source = (...names: string[]): HeaderSource => ({
      url: () => 'http://x.test/',
      headersArray: () => [
        { name: 'X-Other', value: '1' },
        ...names.map((name) => ({ name, value: "default-src 'self'" })),
      ],
    })

    test('exactly one: accepted (either header name, any case)', async () => {
      expect((await expectSingleCspHeader(source('Content-Security-Policy'))).name).toBe('Content-Security-Policy')
      expect((await expectSingleCspHeader(source('content-security-policy-report-only'))).value).toContain(
        'default-src',
      )
    })

    test('zero is rejected by exactly-one but allowed by the duplicate guard', async () => {
      await expectToFail(() => expectSingleCspHeader(source()), /exactly one CSP header, found 0/)
      await expectNoDuplicateCspHeaders(source())
    })

    test('two headers are rejected, including enforcing plus report-only', async () => {
      await expectToFail(
        () => expectSingleCspHeader(source('Content-Security-Policy', 'Content-Security-Policy')),
        /found 2/,
      )
      await expectToFail(
        () => expectNoDuplicateCspHeaders(source('Content-Security-Policy', 'Content-Security-Policy-Report-Only')),
        /2 CSP headers/,
      )
    })

    test('a real HTTP response with a duplicated header is rejected (plain fetch, headersArray keeps duplicates)', async ({
      playwright,
    }) => {
      const server = createServer((_req, res) => {
        res.setHeader('content-type', 'text/html')
        res.setHeader('content-security-policy', ["default-src 'self'", "script-src 'self'"])
        res.end(doc('<p>x</p>'))
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      try {
        const address = server.address()
        const port = typeof address === 'object' && address ? address.port : 0
        const request = await playwright.request.newContext()
        const response = await request.get(`http://127.0.0.1:${port}/`)
        await expectToFail(() => expectSingleCspHeader(response), /found 2/)
        await request.dispose()
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()))
      }
    })
  })

  test.describe('raw HTML (no JavaScript)', () => {
    test('htmlToText drops scripts, styles, tags and decodes entities', () => {
      const text = htmlToText('<style>p{}</style><p>Pawn&apos;s &amp; <b>Gambit</b></p><script>var x="hidden"</script>')
      expect(text).toBe("Pawn's & Gambit")
    })

    test('expectRawContent accepts present text and links, rejects absent ones', () => {
      const html = '<main><h1>Events</h1><a class="c" href="/events/open-1">Open</a></main>'
      const raw = { html, text: htmlToText(html), status: 200 } as Parameters<typeof expectRawContent>[0]
      expectRawContent(raw, { text: ['Events'], links: ['/events/open-1'] })
      expect(() => expectRawContent(raw, { text: ['Missing'] })).toThrow(/missing text "Missing"/)
      expect(() => expectRawContent(raw, { links: ['/events/other'] })).toThrow(/missing an anchor/)
    })

    test('fetchRawHtml sees server-rendered content and does NOT see client-rendered content', async ({
      playwright,
    }) => {
      const server = createServer((_req, res) => {
        res.setHeader('content-type', 'text/html')
        res.end(
          doc(
            '<main><h1>Server rendered</h1><div id="root"></div></main><script>document.getElementById("root").textContent="Client only"</script>',
          ),
        )
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      try {
        const address = server.address()
        const port = typeof address === 'object' && address ? address.port : 0
        const request = await playwright.request.newContext()
        const raw = await fetchRawHtml(request, `http://127.0.0.1:${port}/`)
        expectRawContent(raw, { text: ['Server rendered'] })
        expect(() => expectRawContent(raw, { text: ['Client only'] })).toThrow(/missing text "Client only"/)
        await request.dispose()
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()))
      }
    })
  })
})
