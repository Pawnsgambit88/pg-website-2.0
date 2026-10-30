import { afterEach, describe, expect, it } from 'vitest'
import {
  checkBuildOutput,
  MOCK_SENTINEL,
  resolveProfile,
  type Finding,
  type Options,
  type Profile,
  type RegistryRoute,
} from './check-build-output.ts'
import { createTempProject, type TempProject } from './test-support/fixture-project.ts'

// TASK-121: the build-output checker against synthetic `.next` trees. Every assertion has a passing tree and a tree
// that breaks exactly that assertion, including the positive control for the mock sentinel (OPS-002 9.1 L3).

const projects: TempProject[] = []
afterEach(() => {
  for (const p of projects.splice(0)) p.cleanup()
})

const HANDOFF_LAYOUT = `import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const metadata = NOINDEX_METADATA
export default function L({ children }) {
  if (!envPublic.USE_MOCKS) notFound()
  return children
}
`
const NOINDEX_LAYOUT =
  "import { NOINDEX_METADATA } from '@/lib/routes/metadata'\nexport const metadata = NOINDEX_METADATA\n"
const PUBLIC_LAYOUT = 'export const metadata = { robots: { index: true } }\n'

/** Compiled handoff layout as Turbopack emits it (minified, shape from the real build). */
const COMPILED_HANDOFF =
  'a.s(["default",0,function({children:a}){return h.f.USE_MOCKS||(0,c.notFound)(),a},"dynamic",0,"force-dynamic"])'

interface Tree {
  /** extra files, relative to the project root */
  files?: Record<string, string>
  /** replace files created by default */
  override?: Record<string, string | null>
  prerender?: { routes?: Record<string, number | false>; dynamicRoutes?: string[] }
  pages?: Record<string, string>
  headers?: { key: string; value: string }[]
}

const PAGES: Record<string, string> = {
  '/(public)/page': '/',
  '/(public)/play/page': '/play',
  '/(public)/events/[slug]/page': '/events/[slug]',
  '/(auth)/login/page': '/login',
  '/(app)/app/page': '/app',
  '/(admin)/admin/page': '/admin',
  '/(handoff)/handoff/page': '/handoff',
  '/_not-found/page': '/_not-found',
}

const REGISTRY: RegistryRoute[] = [
  { pattern: '/', group: 'public', render: 'static' },
  { pattern: '/play', group: 'public', render: 'static' },
  { pattern: '/events/[slug]', group: 'public', render: 'isr' },
  { pattern: '/login', group: 'auth', render: 'dynamic' },
  { pattern: '/app', group: 'app', render: 'dynamic' },
  { pattern: '/admin', group: 'admin', render: 'dynamic' },
  { pattern: '/handoff', group: 'handoff', render: 'dynamic' },
]

function build(tree: Tree = {}): TempProject {
  const project = createTempProject('buildout')
  projects.push(project)
  const files: Record<string, string> = {
    '.next/prerender-manifest.json': JSON.stringify({
      version: 4,
      routes: Object.fromEntries(
        Object.entries(tree.prerender?.routes ?? { '/': 900, '/play': 900, '/_not-found': false }).map(([k, v]) => [
          k,
          { initialRevalidateSeconds: v },
        ]),
      ),
      dynamicRoutes: Object.fromEntries((tree.prerender?.dynamicRoutes ?? ['/events/[slug]']).map((k) => [k, {}])),
    }),
    '.next/app-path-routes-manifest.json': JSON.stringify(tree.pages ?? PAGES),
    '.next/routes-manifest.json': JSON.stringify({
      headers: [{ source: '/:path*', headers: tree.headers ?? [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }],
    }),
    '.next/static/chunks/app.js': 'console.log("hello")',
    '.next/server/chunks/ssr/handoff-layout.js': COMPILED_HANDOFF,
    '.next/server/app/index.html': '<html><head><meta name="viewport" content="width=device-width"/></head></html>',
    'src/app/(handoff)/layout.tsx': HANDOFF_LAYOUT,
    'src/app/(auth)/layout.tsx': NOINDEX_LAYOUT,
    'src/app/(app)/layout.tsx': NOINDEX_LAYOUT,
    'src/app/(admin)/layout.tsx': NOINDEX_LAYOUT,
    'src/app/(public)/layout.tsx': PUBLIC_LAYOUT,
    'src/app/(public)/events/[slug]/page.tsx':
      'export const revalidate = 900\nexport default function P() { return null }\n',
    ...tree.files,
  }
  for (const [path, content] of Object.entries(tree.override ?? {})) {
    if (content === null) delete files[path]
    else files[path] = content
  }
  project.write(files)
  return project
}

function run(
  project: TempProject,
  profile: Profile = 'production',
  env: Options['env'] = {},
  registry: RegistryRoute[] = REGISTRY,
): Finding[] {
  return checkBuildOutput({ webRoot: project.root, profile, env, registry })
}

const messages = (findings: Finding[]) => findings.map((f) => `[${f.check}] ${f.message}`).join('\n')

describe('check-build-output: passing trees', () => {
  it('accepts a clean production-profile build', () => {
    expect(run(build())).toEqual([])
  })

  it('accepts a clean mock-profile build (mock code allowed, no src/lib/mock yet so no sentinel needed)', () => {
    expect(run(build(), 'mock')).toEqual([])
  })
})

describe('check-build-output: mock sentinel and positive control (OPS-002 9.1 L3, ARCH-001 11.3)', () => {
  const withSentinel = { '.next/static/chunks/mock.js': `var x="${MOCK_SENTINEL}"` }

  it('production profile: an injected sentinel in a client chunk fails', () => {
    expect(messages(run(build({ files: withSentinel })))).toMatch(
      /\[mocks\] mock code in a production-profile build: "__PG_MOCK_SENTINEL/,
    )
  })

  it('production profile: an injected sentinel in server output fails', () => {
    expect(messages(run(build({ files: { '.next/server/chunks/ssr/x.js': `a("${MOCK_SENTINEL}")` } })))).toMatch(
      /\[mocks\]/,
    )
  })

  it('production profile: other mock markers fail (storage key, lib/mock chunk name, dev component)', () => {
    expect(
      messages(run(build({ files: { '.next/static/chunks/a.js': 'sessionStorage.getItem("pg:mock:v1")' } }))),
    ).toMatch(/pg:mock:v1/)
    expect(
      messages(run(build({ files: { '.next/server/chunks/ssr/src_lib_mock_adapter_ts_abc._.js': '1' } }))),
    ).toMatch(/lib_mock_/)
    expect(messages(run(build({ files: { '.next/static/chunks/banner.js': 'function MockBanner(){}' } })))).toMatch(
      /MockBanner/,
    )
  })

  it('production profile: a mock source path in a source map fails', () => {
    const map = JSON.stringify({ version: 3, sources: ['../../src/lib/mock/adapter.ts'] })
    expect(messages(run(build({ files: { '.next/static/chunks/a.js.map': map } })))).toMatch(
      /source \.\.\/\.\.\/src\/lib\/mock\/adapter\.ts/,
    )
  })

  it('production profile: a mock-only route fails', () => {
    const pages = { ...PAGES, '/api/mock-publish/route': '/api/mock-publish' }
    expect(messages(run(build({ pages })))).toMatch(/mock-only route \/api\/mock-publish/)
  })

  it('mock profile: the same sentinel is allowed', () => {
    expect(run(build({ files: withSentinel }), 'mock')).toEqual([])
  })

  it('mock profile positive control: once src/lib/mock exists the sentinel MUST be found, else the scanner is blind', () => {
    const missing = build({ files: { 'src/lib/mock/sentinel.ts': `export const S = '${MOCK_SENTINEL}'\n` } })
    expect(messages(run(missing, 'mock'))).toMatch(/does not contain the sentinel/)
    const found = build({ files: { 'src/lib/mock/sentinel.ts': 'x', ...withSentinel } })
    expect(run(found, 'mock')).toEqual([])
  })
})

describe('check-build-output: routes (rendering mode, finite revalidate >= 60)', () => {
  it('a (public) route that is dynamic fails', () => {
    const tree = build({ prerender: { routes: { '/': 900 } } }) // /play not prerendered -> dynamic
    expect(messages(run(tree))).toMatch(/\(public\) route \/play is dynamic/)
  })

  it('a (public) route without revalidate (false) fails', () => {
    expect(messages(run(build({ prerender: { routes: { '/': false, '/play': 900 } } })))).toMatch(
      /\/ has no finite revalidate/,
    )
  })

  it('a (public) route below 60s fails', () => {
    expect(messages(run(build({ prerender: { routes: { '/': 30, '/play': 900 } } })))).toMatch(/below the 60s floor/)
  })

  it('a (public) route with an unexpected window fails', () => {
    expect(messages(run(build({ prerender: { routes: { '/': 3600, '/play': 900 } } })))).toMatch(/expected 900s/)
  })

  it('an ISR route without a literal revalidate export fails, with a non-finite one fails', () => {
    const none = build({
      override: { 'src/app/(public)/events/[slug]/page.tsx': 'export default function P() { return null }\n' },
    })
    expect(messages(run(none))).toMatch(/\/events\/\[slug\] has no finite revalidate/)
    const low = build({ override: { 'src/app/(public)/events/[slug]/page.tsx': 'export const revalidate = 10\n' } })
    expect(messages(run(low))).toMatch(/below the 60s floor/)
  })

  it('a prerendered client-group route fails', () => {
    expect(messages(run(build({ prerender: { routes: { '/': 900, '/play': 900, '/login': false } } })))).toMatch(
      /\(auth\) route \/login is prerendered/,
    )
  })

  it('a route outside every group fails', () => {
    expect(messages(run(build({ pages: { ...PAGES, '/stray/page': '/stray' } })))).toMatch(/outside every route group/)
  })

  it('observed mode must agree with routes.ts', () => {
    const registry = REGISTRY.map((r) => (r.pattern === '/login' ? { ...r, render: 'static' } : r))
    expect(messages(run(build(), 'production', {}, registry))).toMatch(
      /\/login built as dynamic but routes.ts says static/,
    )
  })

  it('a missing build fails with a clear message', () => {
    const project = createTempProject('empty')
    projects.push(project)
    expect(messages(run(project))).toMatch(/run `next build` first/)
  })
})

describe('check-build-output: /handoff gate', () => {
  it('a prerendered /handoff route fails (any profile)', () => {
    const tree = build({ prerender: { routes: { '/': 900, '/play': 900, '/handoff': false } } })
    expect(messages(run(tree, 'mock'))).toMatch(/\/handoff was prerendered/)
    expect(messages(run(tree))).toMatch(/\/handoff/)
  })

  it('production: a layout without the notFound() gate fails in source', () => {
    const tree = build({
      override: {
        'src/app/(handoff)/layout.tsx':
          "export const dynamic = 'force-dynamic'\nexport default function L() { return null }\n",
      },
    })
    expect(messages(run(tree))).toMatch(/must call notFound\(\) when mocks are off/)
  })

  it('production: a layout without force-dynamic fails in source', () => {
    const tree = build({
      override: {
        'src/app/(handoff)/layout.tsx': HANDOFF_LAYOUT.replace("export const dynamic = 'force-dynamic'\n", ''),
      },
    })
    expect(messages(run(tree))).toMatch(/force-dynamic/)
  })

  it('production: a build whose compiled output lacks the gate fails', () => {
    const tree = build({
      override: { '.next/server/chunks/ssr/handoff-layout.js': 'a.s(["default",0,function({children:a}){return a}])' },
    })
    expect(messages(run(tree))).toMatch(/no compiled server module combines USE_MOCKS, notFound and force-dynamic/)
  })

  it('mock profile skips the gate assertions', () => {
    const tree = build({
      override: {
        'src/app/(handoff)/layout.tsx':
          'export const metadata = NOINDEX_METADATA\nexport default function L() { return null }\n',
      },
    })
    expect(run(tree, 'mock')).toEqual([])
  })
})

describe('check-build-output: secrets in client bundles', () => {
  it('a secret-looking NEXT_PUBLIC_ name fails', () => {
    for (const name of [
      'NEXT_PUBLIC_API_KEY',
      'NEXT_PUBLIC_AUTH_TOKEN',
      'NEXT_PUBLIC_DB_PASSWORD',
      'NEXT_PUBLIC_REVALIDATE_SECRET',
    ]) {
      const tree = build({ files: { '.next/static/chunks/leak.js': `var a=process.env.${name}` } })
      expect(messages(run(tree)), name).toMatch(new RegExp(`\\[secrets\\] ${name} appears in client bundle`))
    }
  })

  it('a benign NEXT_PUBLIC_ name passes', () => {
    expect(run(build({ files: { '.next/static/chunks/ok.js': 'process.env.NEXT_PUBLIC_SITE_URL' } }))).toEqual([])
  })

  it('a server-only variable name or its value in the client bundle fails', () => {
    expect(messages(run(build({ files: { '.next/static/chunks/a.js': 'x=process.env.REVALIDATE_SECRET' } })))).toMatch(
      /server-only variable name REVALIDATE_SECRET/,
    )
    const env = { REVALIDATE_SECRET: 'dummy-secret-value-0123456789' }
    expect(
      messages(
        run(build({ files: { '.next/static/chunks/b.js': 'x="dummy-secret-value-0123456789"' } }), 'production', env),
      ),
    ).toMatch(/the value of REVALIDATE_SECRET appears/)
  })

  it('a secret value in server output is fine (server bundles may hold it)', () => {
    const env = { REVALIDATE_SECRET: 'dummy-secret-value-0123456789' }
    expect(
      run(build({ files: { '.next/server/chunks/ssr/s.js': 'x="dummy-secret-value-0123456789"' } }), 'production', env),
    ).toEqual([])
  })

  it('short or absent values are not searched (no false positives from tiny dummies)', () => {
    expect(
      run(build({ files: { '.next/static/chunks/a.js': 'abc' } }), 'production', { REVALIDATE_SECRET: 'abc' }),
    ).toEqual([])
  })
})

describe('check-build-output: CSP and noindex', () => {
  it('unsafe-eval in a client bundle, prerendered HTML or the route manifest fails', () => {
    expect(messages(run(build({ files: { '.next/static/chunks/a.js': "script-src 'unsafe-eval'" } })))).toMatch(
      /\[csp\]/,
    )
    expect(
      messages(
        run(
          build({
            files: {
              '.next/server/app/play.html':
                "<meta http-equiv='Content-Security-Policy' content=\"script-src 'unsafe-eval'\">",
            },
          }),
        ),
      ),
    ).toMatch(/\[csp\]/)
    expect(
      messages(run(build({ headers: [{ key: 'Content-Security-Policy', value: "script-src 'self' 'unsafe-eval'" }] }))),
    ).toMatch(/\[csp\].*routes-manifest/)
  })

  it('a client group layout without noindex metadata fails', () => {
    const tree = build({ override: { 'src/app/(admin)/layout.tsx': 'export default function L() { return null }\n' } })
    expect(messages(run(tree))).toMatch(/\(admin\)\/layout\.tsx does not set noindex/)
  })

  it('a global noindex header on a production target fails; on a non-production target it is expected', () => {
    const tree = build({ headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })
    expect(messages(run(tree, 'production', { VERCEL_ENV: 'production' }))).toMatch(/X-Robots-Tag noindex/)
    expect(run(tree, 'production', { VERCEL_ENV: 'preview' })).toEqual([])
    expect(run(tree, 'production', {})).toEqual([])
  })

  it('a robots noindex meta in prerendered HTML on a production target fails', () => {
    const tree = build({
      files: { '.next/server/app/play.html': '<head><meta name="robots" content="noindex, nofollow"/></head>' },
    })
    expect(messages(run(tree, 'production', { VERCEL_ENV: 'production' }))).toMatch(/carries <meta robots noindex>/)
  })
})

describe('check-build-output: profile selection', () => {
  it('follows NEXT_PUBLIC_USE_MOCKS when CHECK_BUILD_PROFILE is unset', () => {
    expect(resolveProfile({})).toEqual({ profile: 'production' })
    expect(resolveProfile({ NEXT_PUBLIC_USE_MOCKS: 'false' })).toEqual({ profile: 'production' })
    expect(resolveProfile({ NEXT_PUBLIC_USE_MOCKS: 'true' })).toEqual({ profile: 'mock' })
  })

  it('accepts an explicit profile that agrees with the build', () => {
    expect(resolveProfile({ CHECK_BUILD_PROFILE: 'production' })).toEqual({ profile: 'production' })
    expect(resolveProfile({ CHECK_BUILD_PROFILE: 'mock', NEXT_PUBLIC_USE_MOCKS: 'true' })).toEqual({ profile: 'mock' })
  })

  it('refuses a profile that contradicts the build (would hide a leak or fail a good build)', () => {
    expect(resolveProfile({ CHECK_BUILD_PROFILE: 'production', NEXT_PUBLIC_USE_MOCKS: 'true' }).error).toMatch(
      /was a mock build/,
    )
    expect(resolveProfile({ CHECK_BUILD_PROFILE: 'mock' }).error).toMatch(/not a mock build/)
    expect(resolveProfile({ CHECK_BUILD_PROFILE: 'staging' }).error).toMatch(/must be "production" or "mock"/)
  })

  it('mock profile refuses a production or staging hosting target (same rule as guard-env)', () => {
    const tree = build()
    expect(messages(run(tree, 'mock', { NEXT_PUBLIC_USE_MOCKS: 'true', VERCEL_ENV: 'production' }))).toMatch(
      /\[profile\].*not allowed for a "production" build/,
    )
    expect(run(tree, 'mock', { NEXT_PUBLIC_USE_MOCKS: 'true', VERCEL_ENV: 'preview' })).toEqual([])
  })
})
