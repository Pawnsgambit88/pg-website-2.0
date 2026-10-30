import { createServer } from 'node:net'
import { defineConfig, devices } from '@playwright/test'

// TASK-009. Playwright harness (ARCH-001 16.2, OPS-002 4.3). Runs against `next build && next start` in mock mode:
// the mock adapter lives in the server process, so no browser-side mocking is needed.
//
// Environment switches:
//   E2E_BASE_URL    Test an already running server; no web server is started and the port logic is skipped.
//   E2E_SKIP_BUILD  Reuse the existing `.next` build (CI builds once in an earlier step; must be a mock-profile build).
//   E2E_PORT        Pin the port. By default a free port is picked once per run.
//   E2E_FIREFOX     Add the Firefox desktop project (nightly only; run `npm run e2e:install -- firefox` first).

const CI = process.env.CI !== undefined && process.env.CI !== ''

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      probe.close(() => (port > 0 ? resolve(port) : reject(new Error('Could not determine a free port'))))
    })
  })
}

// Playwright loads this file again in every worker. Publishing the chosen port through the environment keeps the
// main process and the workers on the same value (workers inherit the environment of the process that spawned them).
const externalBaseUrl = process.env.E2E_BASE_URL
if (externalBaseUrl === undefined && process.env.E2E_PORT === undefined) {
  process.env.E2E_PORT = String(await findFreePort())
}
const port = Number(process.env.E2E_PORT)
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${port}`

// Mobile emulation without a device descriptor: only the viewport, touch and DPR matter here (no UA sniffing).
const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } as const

// File-name suffixes select which specs run where. Everything else runs once per viewport project.
const RAW_SPECS = /.*\.raw\.spec\.ts$/ // JavaScript disabled, plain fetches: run once
const SELFTEST_SPECS = /.*\.selftest\.spec\.ts$/ // helper self-tests on inline fixtures: run once, in a scripted browser
const NOT_PER_VIEWPORT = [RAW_SPECS, SELFTEST_SPECS]

function chromiumAt(width: number, height: number, extra: Record<string, unknown> = {}) {
  return {
    name: `chromium-${width}`,
    testIgnore: NOT_PER_VIEWPORT,
    use: { ...devices['Desktop Chrome'], viewport: { width, height }, ...extra },
  }
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0, // OPS-002 FM-CI-15: at most one retry, flakes are tracked rather than hidden
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    trace: 'retain-on-failure',
  },
  projects: [
    // One Chromium project per viewport (ARCH-001 16.2). The two narrow ones are touch devices.
    chromiumAt(1440, 900),
    chromiumAt(1280, 800),
    chromiumAt(1024, 768),
    chromiumAt(768, 1024),
    chromiumAt(390, 844, mobile),
    chromiumAt(320, 568, mobile),

    // WebKit runs at 390 (mobile) and 1440 (desktop) on every PR.
    {
      name: 'webkit-1440',
      testIgnore: NOT_PER_VIEWPORT,
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-390',
      testIgnore: NOT_PER_VIEWPORT,
      use: { ...devices['Desktop Safari'], viewport: { width: 390, height: 844 }, ...mobile },
    },

    // Raw-HTML and header specs: JavaScript disabled, plus the `request` fixture for plain fetches (no browser
    // involved). Selected by the `.raw.spec.ts` suffix so they run once, not once per viewport.
    {
      name: 'raw-html',
      testMatch: RAW_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, javaScriptEnabled: false },
    },

    // Helper self-tests (TASK-009 acceptance: helpers fail on deliberately broken fixtures). They do not touch the
    // app, so one Chromium run is enough; WebKit adds nothing for inline fixtures.
    {
      name: 'helper-selftest',
      testMatch: SELFTEST_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },

    // Nightly only (ARCH-001 16.2).
    ...(process.env.E2E_FIREFOX === undefined
      ? []
      : [
          {
            name: 'firefox-1440',
            testIgnore: NOT_PER_VIEWPORT,
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
          },
        ]),
  ],
  webServer:
    externalBaseUrl === undefined
      ? {
          // Build and serve the mock profile. `npm run build` runs the env guard first (mocks are refused on a
          // production Vercel target, so a stray VERCEL_ENV=production makes this fail loudly, which is intended).
          command: `${process.env.E2E_SKIP_BUILD === undefined ? 'npm run build && ' : ''}npm run start -- -p ${port} -H 127.0.0.1`,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 300_000,
          env: {
            NODE_ENV: 'production',
            NEXT_PUBLIC_USE_MOCKS: 'true',
            NEXT_PUBLIC_SITE_URL: baseURL,
            NEXT_TELEMETRY_DISABLED: '1',
          },
        }
      : undefined,
})
