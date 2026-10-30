import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkDirectives, CLIENT_ONLY_PATHS, SERVER_ONLY_PATHS } from './check-module-directives.ts'
import { createTempProject, FAKE_PACKAGES, type TempProject } from './test-support/fixture-project.ts'

// TASK-121: every rule in .dependency-cruiser.cjs and every check in scripts/check-module-directives.ts has a failing
// fixture here and a passing counterpart. Fixtures are written to a temp directory and cruised with the REAL config.

const WEB = process.cwd()
const CONFIG = resolve(WEB, '.dependency-cruiser.cjs')
const DEPCRUISE = resolve(WEB, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs')

const projects: TempProject[] = []
afterEach(() => {
  for (const p of projects.splice(0)) p.cleanup()
})

interface Violation {
  rule: { name: string; severity: string }
  from: string
  to: string
}

function cruise(files: Record<string, string>): Violation[] {
  const project = createTempProject('depcruise')
  projects.push(project)
  project.write({ ...FAKE_PACKAGES, ...files })
  const run = spawnSync(process.execPath, [DEPCRUISE, 'src', '--config', CONFIG, '--output-type', 'json'], {
    cwd: project.root,
    encoding: 'utf8',
    maxBuffer: 20_000_000,
  })
  const json = JSON.parse(run.stdout) as { summary: { violations: Violation[] } }
  return json.summary.violations
}

const errors = (violations: Violation[]) =>
  violations.filter((v) => v.rule.severity === 'error').map((v) => v.rule.name)

const CLIENT = "'use client'\n"
// tsPreCompilationDeps is false (type-only imports are erased), so an import must be USED to count as a dependency.
const PUBLIC_PAGE = (imports: string) => {
  const names = [...imports.matchAll(/import\s*(?:\*\s*as\s*)?\{?([^}'\n]*?)\}?\s*from/g)].flatMap((m) =>
    (m[1] ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean),
  )
  return `${imports}\nexport default function Page() { return [${names.join(', ')}] }\n`
}

describe('dependency-cruiser rules (ARCH-001 M3 to M6)', { timeout: 60_000 }, () => {
  it('passes a compliant tree', () => {
    const v = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE(
        "import { Card } from '@/components/ui/Card'\nimport { f } from '@/lib/format/x'",
      ),
      'src/components/ui/Card.tsx': 'export const Card = () => null\n',
      'src/lib/format/x.ts': 'export const f = 1\n',
      'src/app/(app)/page.tsx': PUBLIC_PAGE("import { A } from '@/features/a/A'"),
      'src/features/a/A.tsx': `${CLIENT}import { b } from './b'\nexport const A = () => b\n`,
      'src/features/a/b.ts': 'export const b = 1\n',
    })
    expect(errors(v)).toEqual([])
  })

  it('M3: (public) may not import features, even through a shared component', () => {
    const v = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { Wrap } from '@/components/ui/Wrap'"),
      'src/components/ui/Wrap.tsx': "import { A } from '@/features/a/A'\nexport const Wrap = A\n",
      'src/features/a/A.tsx': `${CLIENT}export const A = () => null\n`,
    })
    expect(errors(v)).toContain('m3-public-no-features')
  })

  it('M3: (public) may not import lib/query or @tanstack, even transitively', () => {
    const direct = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { q } from '@/lib/query/provider'"),
      'src/lib/query/provider.ts': `${CLIENT}export const q = 1\n`,
    })
    expect(errors(direct)).toContain('m3-public-no-query')
    const pkg = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { useQuery } from '@tanstack/react-query'"),
    })
    expect(errors(pkg)).toContain('m3-public-no-query')
  })

  it('M3: (public) may not import the browser mock store', () => {
    const v = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { s } from '@/lib/mock/store.browser'"),
      'src/lib/mock/store.browser.ts': `${CLIENT}export const s = 1\n`,
    })
    expect(errors(v)).toContain('m3-public-no-mock-store')
  })

  it('M3 / F-04: (public) may not reach the token store, session lock or auth code', () => {
    for (const [path, spec] of [
      ['src/lib/api/browser/tokens.ts', '@/lib/api/browser/tokens'],
      ['src/lib/api/browser/session-lock.ts', '@/lib/api/browser/session-lock'],
      ['src/lib/api/browser/step-up.ts', '@/lib/api/browser/step-up'],
      ['src/lib/api/browser/auth-transport.ts', '@/lib/api/browser/auth-transport'],
      ['src/lib/auth/session.ts', '@/lib/auth/session'],
    ] as const) {
      const direct = cruise({
        'src/app/(public)/page.tsx': PUBLIC_PAGE(`import { t } from '${spec}'`),
        [path]: `${CLIENT}export const t = 1\n`,
      })
      expect(errors(direct), path).toContain('m3-public-no-token-or-auth-code')
    }
    // Negative fixture: the non-secret session hint IS allowed in (public), also through a nav island.
    const hint = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { NavAuth } from '@/components/layout/NavAuth'"),
      'src/components/layout/NavAuth.tsx': `${CLIENT}import { readSessionHint } from '@/lib/auth/session-hint'
export const NavAuth = () => readSessionHint()
`,
      'src/lib/auth/session-hint.ts': `${CLIENT}import { defineStore } from '@/lib/storage/versioned'
export const readSessionHint = () => defineStore
`,
      'src/lib/storage/versioned.ts': 'export const defineStore = 1\n',
    })
    expect(errors(hint)).toEqual([])
    // Transitive: a public component imports a shared hook that imports the token store.
    const transitive = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { H } from '@/components/layout/NavAuth'"),
      'src/components/layout/NavAuth.tsx': `${CLIENT}import { t } from '@/lib/api/browser/tokens'\nexport const H = () => t\n`,
      'src/lib/api/browser/tokens.ts': `${CLIENT}export const t = 1\n`,
    })
    expect(errors(transitive)).toContain('m3-public-no-token-or-auth-code')
  })

  it('F-04: the session hint may not import the token store (directly or through another module)', () => {
    const direct = cruise({
      'src/lib/auth/session-hint.ts': `${CLIENT}import { t } from '@/lib/api/browser/tokens'
export const h = t
`,
      'src/lib/api/browser/tokens.ts': `${CLIENT}export const t = 1
`,
    })
    expect(errors(direct)).toContain('f04-session-hint-isolated')
    const via = cruise({
      'src/lib/auth/session-hint.ts': `${CLIENT}import { v } from '@/lib/shared/v'
export const h = v
`,
      'src/lib/shared/v.ts': "import { t } from '@/lib/api/browser/tokens'\nexport const v = t\n",
      'src/lib/api/browser/tokens.ts': `${CLIENT}export const t = 1
`,
    })
    expect(errors(via)).toContain('f04-session-hint-isolated')
    // The token store importing the hint is the allowed direction.
    const ok = cruise({
      'src/lib/api/browser/tokens.ts': `${CLIENT}import { h } from '@/lib/auth/session-hint'
export const t = h
`,
      'src/lib/auth/session-hint.ts': `${CLIENT}export const h = 1
`,
    })
    expect(errors(ok)).toEqual([])
  })

  it('M3: overlays are banned from (public) except Sheet through the mobile menu', () => {
    const bad = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { Dialog } from '@/components/ui/overlay/Dialog'"),
      'src/components/ui/overlay/Dialog.tsx': `${CLIENT}import * as D from '@radix-ui/react-dialog'\nexport const Dialog = D\n`,
    })
    expect(errors(bad)).toContain('m3-public-no-overlays')
    const ok = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { MobileMenu } from '@/components/layout/MobileMenu'"),
      'src/components/layout/MobileMenu.tsx': `${CLIENT}import { Sheet } from '@/components/ui/overlay/Sheet'\nexport const MobileMenu = Sheet\n`,
      'src/components/ui/overlay/Sheet.tsx': `${CLIENT}import * as D from '@radix-ui/react-dialog'\nexport const Sheet = D\n`,
    })
    expect(errors(ok)).toEqual([])
  })

  it('M3: Radix overlay packages are imported only inside components/ui/overlay', () => {
    const v = cruise({
      'src/components/ui/Popup.tsx': `${CLIENT}import * as D from '@radix-ui/react-dialog'\nexport const Popup = D\n`,
    })
    expect(errors(v)).toContain('m3-radix-overlays-only-in-ui-overlay')
  })

  it('M3 / M13: (public) may not use serverGet, adapters or the mock directly', () => {
    const v = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { serverGet } from '@/lib/api/server/fetch'"),
      'src/lib/api/server/fetch.ts': "import 'server-only'\nexport const serverGet = 1\n",
    })
    expect(errors(v)).toContain('m3-public-no-server-plumbing')
    const ok = cruise({
      'src/app/(public)/page.tsx': PUBLIC_PAGE("import { getEvent } from '@/lib/data/public/getEvent'"),
      'src/lib/data/public/getEvent.ts':
        "import 'server-only'\nimport { serverGet } from '@/lib/api/server/fetch'\nexport const getEvent = serverGet\n",
      'src/lib/api/server/fetch.ts': "import 'server-only'\nexport const serverGet = 1\n",
    })
    expect(errors(ok)).toEqual([])
  })

  it('M4: a feature may not import another feature (but may import itself)', () => {
    const bad = cruise({
      'src/features/a/A.tsx': `${CLIENT}import { b } from '@/features/b/b'\nexport const A = b\n`,
      'src/features/b/b.ts': 'export const b = 1\n',
    })
    expect(errors(bad)).toContain('m4-no-cross-feature')
    const ok = cruise({
      'src/features/a/A.tsx': `${CLIENT}import { a2 } from '@/features/a/a2'\nexport const A = a2\n`,
      'src/features/a/a2.ts': 'export const a2 = 1\n',
    })
    expect(errors(ok)).toEqual([])
  })

  it('M5: a route group may not import another group', () => {
    const bad = cruise({
      'src/app/(app)/page.tsx': PUBLIC_PAGE("import { x } from '@/app/(admin)/admin/parts'"),
      'src/app/(admin)/admin/parts.tsx': 'export const x = 1\n',
    })
    expect(errors(bad)).toContain('m5-no-cross-group')
    const relative = cruise({
      'src/app/(auth)/login/page.tsx': PUBLIC_PAGE("import { x } from '../../(app)/shared'"),
      'src/app/(app)/shared.tsx': 'export const x = 1\n',
    })
    expect(errors(relative)).toContain('m5-no-cross-group')
    const ok = cruise({
      'src/app/(app)/page.tsx': PUBLIC_PAGE("import { x } from './parts'"),
      'src/app/(app)/parts.tsx': 'export const x = 1\n',
    })
    expect(errors(ok)).toEqual([])
  })

  it('M6: a client module may not reach a server-only module, even transitively', () => {
    const direct = cruise({
      'src/features/a/A.tsx': `${CLIENT}import { d } from '@/lib/data/public/getX'\nexport const A = d\n`,
      'src/lib/data/public/getX.ts': "import 'server-only'\nexport const d = 1\n",
    })
    expect(errors(direct)).toContain('m6-client-roots-no-server-only')
    const transitive = cruise({
      'src/lib/query/keys.ts': `${CLIENT}import { h } from '@/lib/shared/helper'\nexport const k = h\n`,
      'src/lib/shared/helper.ts': "import { envServer } from '@/lib/env/env.server'\nexport const h = envServer\n",
      'src/lib/env/env.server.ts': "import 'server-only'\nexport const envServer = 1\n",
    })
    expect(errors(transitive)).toContain('m6-client-roots-no-server-only')
    const pkg = cruise({
      'src/features/a/A.tsx': `${CLIENT}import 'server-only'\nexport const A = 1\n`,
    })
    expect(errors(pkg)).toContain('m6-client-roots-no-server-only')
    const hooks = cruise({
      'src/lib/hooks/useX.ts': `${CLIENT}import { envServer } from '@/lib/env/env.server'\nexport const useX = envServer\n`,
      'src/lib/env/env.server.ts': "import 'server-only'\nexport const envServer = 1\n",
    })
    expect(errors(hooks)).toContain('m6-browser-helpers-no-server-only')
  })

  it('M6: type-only imports of server modules are erased and allowed', () => {
    const v = cruise({
      'src/features/a/A.tsx': `${CLIENT}import type { D } from '@/lib/data/public/getX'\nexport const A = (p: { d: D }) => p\n`,
      'src/lib/data/public/getX.ts': "import 'server-only'\nexport type D = { id: string }\n",
    })
    expect(errors(v)).toEqual([])
  })

  it('no-circular, not-to-unresolvable, not-to-app-from-shared', () => {
    expect(
      errors(
        cruise({
          'src/lib/a.ts': "import { b } from './b'\nexport const a = b\n",
          'src/lib/b.ts': "import { a } from './a'\nexport const b = a\n",
        }),
      ),
    ).toContain('no-circular')
    expect(errors(cruise({ 'src/lib/a.ts': "import { x } from './missing'\nexport const a = x\n" }))).toContain(
      'not-to-unresolvable',
    )
    expect(
      errors(
        cruise({
          'src/components/ui/A.tsx': "import { P } from '@/app/(public)/page'\nexport const A = P\n",
          'src/app/(public)/page.tsx': 'export const P = 1\n',
        }),
      ),
    ).toContain('not-to-app-from-shared')
  })

  it('orphans are reported as warnings only', () => {
    const v = cruise({ 'src/lib/lonely.ts': 'export const x = 1\n' })
    expect(v.some((x) => x.rule.name === 'no-orphans' && x.rule.severity === 'warn')).toBe(true)
    expect(errors(v)).toEqual([])
  })
})

describe('check-module-directives (M6 content checks, M13)', { timeout: 30_000 }, () => {
  function run(files: Record<string, string>) {
    const project = createTempProject('directives')
    projects.push(project)
    project.write(files)
    return checkDirectives(project.root)
  }

  it('passes compliant modules', () => {
    expect(
      run({
        'src/lib/data/public/getX.ts': "import 'server-only'\nexport const g = 1\n",
        'src/lib/api/browser/client.ts': `${CLIENT}export const c = 1\n`,
        'src/features/a/A.tsx': `${CLIENT}export const A = 1\n`,
      }),
    ).toEqual([])
  })

  it('every server-only location must start with import "server-only"', () => {
    for (const path of [
      'src/lib/data/public/getX.ts',
      'src/lib/api/server/fetch.ts',
      'src/lib/revalidate/verify.ts',
      'src/lib/env/env.server.ts',
      'src/lib/api/adapters/index.server.ts',
      'src/lib/thing.server.ts',
    ]) {
      const problems = run({ [path]: 'export const x = 1\n' })
      expect(problems.join('\n'), path).toMatch(/must start with `import 'server-only'`/)
    }
  })

  it('accepts a leading comment before the server-only import but not a later one', () => {
    expect(
      run({ 'src/lib/data/public/a.ts': "// header\n/* more */\nimport 'server-only'\nexport const a = 1\n" }),
    ).toEqual([])
    expect(
      run({ 'src/lib/data/public/a.ts': "import { z } from 'zod'\nimport 'server-only'\nexport const a = z\n" }),
    ).not.toEqual([])
  })

  it('client-only locations need the directive or only client importers', () => {
    expect(run({ 'src/lib/query/keys.ts': 'export const k = 1\n' })).toEqual([])
    const bad = run({
      'src/lib/query/keys.ts': 'export const k = 1\n',
      'src/lib/format/uses.ts': "import { k } from '@/lib/query/keys'\nexport const u = k\n",
    })
    expect(bad.join('\n')).toMatch(/src\/lib\/query\/keys\.ts: M6 client-only module must start with 'use client'/)
    expect(
      run({
        'src/lib/query/keys.ts': 'export const k = 1\n',
        'src/components/Island.tsx': `${CLIENT}import { k } from '@/lib/query/keys'\nexport const I = k\n`,
      }),
    ).toEqual([])
  })

  it("a 'use client' module may not reach a server-only module, however deep (and the chain is reported)", () => {
    const problems = run({
      'src/components/Island.tsx': `${CLIENT}import { h } from '@/lib/shared/h'\nexport const I = h\n`,
      'src/lib/shared/h.ts': "import { deep } from './deep'\nexport const h = deep\n",
      'src/lib/shared/deep.ts': "import { g } from '@/lib/data/public/getX'\nexport const deep = g\n",
      'src/lib/data/public/getX.ts': "import 'server-only'\nexport const g = 1\n",
    })
    expect(problems.join('\n')).toMatch(
      /Island\.tsx.*reaches server-only module via .*Island\.tsx -> .*h\.ts -> .*deep\.ts -> .*getX\.ts/,
    )
  })

  it("a 'use client' module may not import next/headers or server-only directly", () => {
    expect(
      run({
        'src/components/I.tsx': `${CLIENT}import { cookies } from 'next/headers'\nexport const I = cookies\n`,
      }).join(),
    ).toMatch(/next\/headers/)
    expect(run({ 'src/components/I.tsx': `${CLIENT}import 'server-only'\nexport const I = 1\n` }).join()).toMatch(
      /server-only/,
    )
  })

  it('type-only imports from a client module to a server module are allowed', () => {
    expect(
      run({
        'src/components/I.tsx': `${CLIENT}import type { D } from '@/lib/data/public/getX'\nexport const I = (p: { d: D }) => p\n`,
        'src/lib/data/public/getX.ts': "import 'server-only'\nexport type D = { id: string }\n",
      }),
    ).toEqual([])
  })

  it('F-04: lib/auth/session-hint.ts must not import anything from lib/api/browser (value, type or relative)', () => {
    const hint = (importLine: string) => ({
      'src/lib/auth/session-hint.ts': `${importLine}
export const h = 1
`,
      'src/lib/api/browser/tokens.ts': `${CLIENT}export const t = 1
`,
    })
    expect(run(hint("import { t } from '@/lib/api/browser/tokens'")).join()).toMatch(
      /session hint must not import the token store/,
    )
    expect(run(hint("import type { t } from '@/lib/api/browser/tokens'")).join()).toMatch(
      /session hint must not import the token store/,
    )
    expect(run(hint("import { t } from '../api/browser/tokens'")).join()).toMatch(
      /session hint must not import the token store/,
    )
    expect(run(hint("import { z } from '@/lib/storage/versioned'")).join()).not.toMatch(/session hint/)
  })

  it('M13: a dynamic public page must validate the param before the first data call, and call notFound()', () => {
    const page = (body: string) => ({
      'src/app/(public)/events/[slug]/page.tsx': `import { notFound } from 'next/navigation'\nimport { getEventBySlug } from '@/lib/data/public/getEventBySlug'\nimport { isValidSlug } from '@/lib/routes/params'\n${body}`,
      'src/lib/data/public/getEventBySlug.ts':
        "import 'server-only'\nexport const getEventBySlug = async (s: string) => s\n",
      'src/lib/routes/params.ts': 'export const isValidSlug = (s: string) => s.length > 0\n',
    })
    const good = page(
      'export default async function Page({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params\n  if (!isValidSlug(slug)) notFound()\n  const e = await getEventBySlug(slug)\n  return e\n}\n',
    )
    expect(run(good)).toEqual([])
    const fetchFirst = page(
      'export default async function Page({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params\n  const e = await getEventBySlug(slug)\n  if (!isValidSlug(slug)) notFound()\n  return e\n}\n',
    )
    expect(run(fetchFirst).join()).toMatch(/calls lib\/data\/public before validating/)
    const metadataUnvalidated = page(
      'export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params\n  return getEventBySlug(slug)\n}\nexport default async function Page({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params\n  if (!isValidSlug(slug)) notFound()\n  return getEventBySlug(slug)\n}\n',
    )
    expect(run(metadataUnvalidated).join()).toMatch(/generateMetadata\(\) calls lib\/data\/public before validating/)
    const noNotFound = good
    noNotFound['src/app/(public)/events/[slug]/page.tsx'] = noNotFound[
      'src/app/(public)/events/[slug]/page.tsx'
    ].replace('notFound()\n  const', 'void 0\n  const')
    expect(run(noNotFound).join()).toMatch(/must call notFound/)
  })
})

describe('configuration consistency', () => {
  it('the SERVER_ONLY and CLIENT_ONLY lists in the cruiser config agree with the directive checker', () => {
    // Each sample path must be classified identically by both tools.
    const samples = {
      server: [
        'src/lib/data/public/getX.ts',
        'src/lib/api/server/fetch.ts',
        'src/lib/revalidate/verify.ts',
        'src/lib/env/env.server.ts',
        'src/lib/api/adapters/index.server.ts',
        'src/lib/foo.server.ts',
      ],
      client: [
        'src/features/a/A.tsx',
        'src/lib/api/browser/client.ts',
        'src/lib/query/keys.ts',
        'src/lib/mock/store.browser.ts',
        'src/lib/api/adapters/index.browser.ts',
      ],
    }
    for (const path of samples.server)
      expect(
        SERVER_ONLY_PATHS.some((re) => re.test(path)),
        path,
      ).toBe(true)
    for (const path of samples.client)
      expect(
        CLIENT_ONLY_PATHS.some((re) => re.test(path)),
        path,
      ).toBe(true)
    // And the cruiser config flags the same paths (read from the source, so the lists cannot silently drift).
    const config = (createRequire(import.meta.url)(CONFIG) as { forbidden: { name: string; to: { path?: string } }[] })
      .forbidden
    const server = new RegExp(config.find((r) => r.name === 'm6-client-roots-no-server-only')?.to.path ?? '$^')
    for (const path of samples.server) expect(server.test(path), path).toBe(true)
  })
})
