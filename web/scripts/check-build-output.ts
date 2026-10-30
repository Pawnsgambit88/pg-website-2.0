// TASK-121: assertions on the output of `next build` (ARCH-001 16.1 build-output row, 17.1, 11.3; OPS-002 9.1 L3/L4,
// S-03; SEC-001 F-09). Run by `npm run build` (explicit chain, see package.json) and on its own as
// `npm run check:build-output`.
//
// PROFILE. The build a job produced decides which assertions apply:
//   production  mocks off. Asserts that no mock code, fixture, sentinel or mock-only route is in the output.
//   mock        mocks on (Playwright/E2E and preview opt-in builds, NODE_ENV=production + NEXT_PUBLIC_USE_MOCKS=true).
//               Skips the "no mock" assertions, refuses a production/staging hosting target (same rule as guard-env),
//               and, once src/lib/mock exists, asserts the sentinel IS present (positive control: a scanner that can
//               no longer see the sentinel would let a production leak pass).
// Selected by CHECK_BUILD_PROFILE=production|mock. If unset it follows NEXT_PUBLIC_USE_MOCKS (true => mock), which is
// the same variable the build read, so `NEXT_PUBLIC_USE_MOCKS=true npm run build` needs no extra setting. An explicit
// value that contradicts NEXT_PUBLIC_USE_MOCKS is an error (it would hide a leak or fail a good build).
//
// Checks (all profiles unless noted):
//   routes      every page has a group and a rendering mode; (public) pages are static or ISR with revalidate finite,
//               >= 60 and equal to the expected value; client groups are never prerendered; the observed mode agrees
//               with src/lib/routes/routes.ts.
//   handoff     /handoff* is built dynamic (never prerendered) and the group layout is gated by notFound() unless
//               mocks are on, in source and in the compiled server output (production profile). Whether the gate
//               answers 404 at runtime is the e2e/post-deploy smoke's job; a static check cannot execute it.
//   mocks       (production) no mock sentinel, mock storage key, lib/mock source, mock chunk or dev component in
//               .next/static or .next/server, and no /api/mock-publish route.
//   secrets     no NEXT_PUBLIC_* name that looks like a secret in client bundles; no server-only variable name, and no
//               value of one that is set in this process, in .next/static.
//   csp         no 'unsafe-eval' in client bundles, prerendered HTML or the route manifest headers.
//   noindex     client groups carry noindex metadata; (public) is not noindexed (production profile on a production
//               target).
//
// Only erasable TypeScript is used (Node strips types natively, same as guard-env.ts).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { checkBuildEnv } from '../src/lib/env/guard.ts'

export type Profile = 'production' | 'mock'
export interface Finding {
  check: 'profile' | 'routes' | 'handoff' | 'mocks' | 'secrets' | 'csp' | 'noindex'
  message: string
}
export interface RegistryRoute {
  readonly pattern: string
  readonly group: string
  readonly render: string
}
export interface Options {
  /** web/ directory (holds src/ and .next/). */
  webRoot: string
  /** Defaults to `<webRoot>/.next`. */
  distDir?: string
  profile: Profile
  /** Process environment (secret values, VERCEL_ENV). */
  env?: Readonly<Record<string, string | undefined>>
  /** Route registry; the CLI loads src/lib/routes/routes.ts. Omit to skip the registry cross-check. */
  registry?: readonly RegistryRoute[]
}

/** Exported only by lib/mock (TASK-016/017 must export exactly this string from src/lib/mock/sentinel.ts). */
export const MOCK_SENTINEL = '__PG_MOCK_SENTINEL_9d41c7e2__'
/** Revalidate window for (public) pages, seconds (ARCH-001 7.3). */
export const PUBLIC_REVALIDATE = 900
export const MIN_REVALIDATE = 60
/** Per-route override of the expected revalidate (for example a legal page on a longer window). Empty by design. */
export const REVALIDATE_OVERRIDES: Readonly<Record<string, number>> = {}

const MOCK_CONTENT_MARKERS = [MOCK_SENTINEL, 'pg:mock:v1', 'MockBanner', 'ScenarioPanel']
const MOCK_PATH_MARKER = /lib[/_]mock[/_]|components[/_]dev[/_]/
const MOCK_ROUTES = ['/api/mock-publish']
const SERVER_ENV_NAMES = [
  'API_INTERNAL_URL',
  'REVALIDATE_SECRET',
  'REVALIDATE_SECRET_PREVIOUS',
  'PREVIEW_SECRET',
  'MOCK_PUBLISH_SECRET',
]
const SECRET_PUBLIC_NAME = /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD|PRIVATE|CREDENTIAL)[A-Z0-9_]*/g
const TEXT_EXTENSIONS = /\.(?:js|mjs|cjs|css|html?|rsc|meta|json|txt|segment)$/
const MAX_SCAN_BYTES = 40_000_000

// ---------- profile ----------

export function resolveProfile(env: Readonly<Record<string, string | undefined>>): {
  profile?: Profile
  error?: string
} {
  const explicit = env.CHECK_BUILD_PROFILE
  const mocksOn = env.NEXT_PUBLIC_USE_MOCKS === 'true'
  if (explicit !== undefined && explicit !== '' && explicit !== 'production' && explicit !== 'mock') {
    return { error: `CHECK_BUILD_PROFILE must be "production" or "mock", got "${explicit}"` }
  }
  if (explicit === 'production' && mocksOn) {
    return { error: 'CHECK_BUILD_PROFILE=production but NEXT_PUBLIC_USE_MOCKS=true: the build was a mock build' }
  }
  if (explicit === 'mock' && !mocksOn) {
    return { error: 'CHECK_BUILD_PROFILE=mock but NEXT_PUBLIC_USE_MOCKS is not "true": that is not a mock build' }
  }
  const profile: Profile =
    explicit === 'mock' || (explicit === undefined || explicit === '' ? mocksOn : false) ? 'mock' : 'production'
  return { profile }
}

// ---------- file helpers ----------

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function listFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) listFiles(full, out)
    else out.push(full)
  }
  return out
}

function textFiles(dir: string): string[] {
  return listFiles(dir).filter((file) => TEXT_EXTENSIONS.test(file) && statSync(file).size <= MAX_SCAN_BYTES)
}

const posix = (path: string) => path.split(sep).join('/')

// ---------- routes ----------

interface PrerenderManifest {
  routes: Record<string, { initialRevalidateSeconds?: number | false }>
  dynamicRoutes: Record<string, unknown>
}

export function groupOf(pagePath: string): string | undefined {
  return /^\/\(([^)]+)\)\//.exec(pagePath)?.[1]
}

/** `/(public)/events/[slug]/page` -> `/events/[slug]` ; `/(public)/page` -> `/`. */
export function patternOf(pagePath: string): string {
  const stripped = pagePath.replace(/^\/\([^)]+\)/, '').replace(/\/page$/, '')
  return stripped === '' ? '/' : stripped
}

function sourcePageFor(webRoot: string, pagePath: string): string | undefined {
  const base = join(webRoot, 'src', 'app', pagePath.replace(/^\//, ''))
  return ['.tsx', '.ts'].map((ext) => base + ext).find((candidate) => existsSync(candidate))
}

function checkRoutes(options: Options, dist: string, findings: Finding[]): Map<string, string> {
  const add = (message: string) => findings.push({ check: 'routes', message })
  const prerender = readJson(join(dist, 'prerender-manifest.json')) as PrerenderManifest
  const pages = readJson(join(dist, 'app-path-routes-manifest.json')) as Record<string, string>
  const patternGroup = new Map<string, string>()

  for (const pagePath of Object.keys(pages)) {
    if (!pagePath.endsWith('/page')) continue
    const group = groupOf(pagePath)
    const pattern = patternOf(pagePath)
    if (group === undefined) {
      if (!pattern.startsWith('/_')) add(`page ${pattern} is outside every route group`)
      continue
    }
    patternGroup.set(pattern, group)

    const prerendered = prerender.routes[pattern]
    const isr = Object.hasOwn(prerender.dynamicRoutes, pattern)
    const mode = prerendered !== undefined ? 'static' : isr ? 'isr' : 'dynamic'

    if (group === 'public') {
      if (mode === 'dynamic') {
        add(`(public) route ${pattern} is dynamic: public pages must be static or ISR (ARCH-001 7.3)`)
        continue
      }
      const expected = REVALIDATE_OVERRIDES[pattern] ?? PUBLIC_REVALIDATE
      let revalidate: unknown = prerendered?.initialRevalidateSeconds
      if (mode === 'isr') {
        // The prerender manifest does not record the window of an on-demand route: read the literal the page exports.
        const sourcePath = sourcePageFor(options.webRoot, pagePath)
        const source = sourcePath === undefined ? '' : readFileSync(sourcePath, 'utf8')
        const literal = /export\s+const\s+revalidate\s*=\s*(\d+)\s*(?:;|\n)/.exec(source)
        revalidate = literal === null ? undefined : Number(literal[1])
      }
      if (typeof revalidate !== 'number' || !Number.isFinite(revalidate)) {
        add(
          `(public) route ${pattern} has no finite revalidate (found ${String(revalidate)}); export const revalidate = ${expected}`,
        )
      } else if (revalidate < MIN_REVALIDATE) {
        add(`(public) route ${pattern} revalidates every ${revalidate}s, below the ${MIN_REVALIDATE}s floor`)
      } else if (revalidate !== expected) {
        add(`(public) route ${pattern} revalidates every ${revalidate}s, expected ${expected}s (ARCH-001 7.3)`)
      }
    } else if (mode !== 'dynamic') {
      add(
        `(${group}) route ${pattern} is prerendered (${mode}): client groups are dynamic shells so the nonce CSP applies (ARCH-001 7.2)`,
      )
    }
  }

  for (const [pattern, entry] of Object.entries(prerender.routes)) {
    const value = entry.initialRevalidateSeconds
    if (value !== false && (typeof value !== 'number' || !Number.isFinite(value))) {
      add(`prerendered route ${pattern} has a non-finite revalidate (${String(value)})`)
    }
  }

  // Observed mode must agree with the typed registry.
  for (const route of options.registry ?? []) {
    const group = patternGroup.get(route.pattern)
    if (group === undefined) continue
    const prerendered = prerender.routes[route.pattern] !== undefined
    const isr = Object.hasOwn(prerender.dynamicRoutes, route.pattern)
    const mode = prerendered ? 'static' : isr ? 'isr' : 'dynamic'
    const compatible = route.render === mode || (route.render === 'isr' && mode === 'static')
    if (group !== route.group) add(`route ${route.pattern} is in group (${group}) but routes.ts says (${route.group})`)
    if (!compatible) add(`route ${route.pattern} built as ${mode} but routes.ts says ${route.render}`)
  }
  return patternGroup
}

// ---------- handoff ----------

function checkHandoff(options: Options, dist: string, findings: Finding[], groups: Map<string, string>) {
  const add = (message: string) => findings.push({ check: 'handoff', message })
  const handoff = [...groups].filter(([, group]) => group === 'handoff').map(([pattern]) => pattern)
  const prerender = readJson(join(dist, 'prerender-manifest.json')) as PrerenderManifest
  for (const pattern of handoff) {
    if (prerender.routes[pattern] !== undefined)
      add(`${pattern} was prerendered: /handoff must be built dynamic and gated`)
  }
  for (const pattern of Object.keys(prerender.routes)) {
    if (pattern.startsWith('/handoff')) add(`${pattern} is in the prerender manifest`)
  }
  if (options.profile === 'mock') return

  // Gate in source: `if (!envPublic.USE_MOCKS) notFound()` before anything renders.
  const layout = join(options.webRoot, 'src', 'app', '(handoff)', 'layout.tsx')
  const source = existsSync(layout) ? readFileSync(layout, 'utf8') : ''
  if (!/if\s*\(\s*!\s*[\w.]*USE_MOCKS\s*\)\s*(?:\{\s*)?notFound\s*\(\s*\)/.test(source)) {
    add('(handoff)/layout.tsx must call notFound() when mocks are off (`if (!envPublic.USE_MOCKS) notFound()`)')
  }
  if (!/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(source)) {
    add('(handoff)/layout.tsx must export dynamic = "force-dynamic" so the gate runs per request')
  }

  // Gate in the compiled server output: the layout module that exports force-dynamic and reads USE_MOCKS calls notFound.
  if (handoff.length > 0) {
    const chunks = textFiles(join(dist, 'server')).filter((file) => /\.js$/.test(file))
    const gated = chunks.some((file) => {
      const text = readFileSync(file, 'utf8')
      return (
        text.includes('USE_MOCKS') &&
        /["']force-dynamic["']/.test(text) &&
        /notFound/.test(text) &&
        /\.USE_MOCKS\s*\|\|/.test(text)
      )
    })
    if (!gated) {
      add(
        'no compiled server module combines USE_MOCKS, notFound and force-dynamic: the /handoff 404 gate is missing from the build (or the minifier output changed; update the pattern in check-build-output.ts)',
      )
    }
  }
}

// ---------- mocks ----------

function checkMocks(options: Options, dist: string, findings: Finding[]) {
  const add = (message: string) => findings.push({ check: 'mocks', message })
  const roots = [join(dist, 'static'), join(dist, 'server')]
  const found = new Set<string>()
  for (const root of roots) {
    for (const file of listFiles(root)) {
      const rel = posix(relative(dist, file))
      if (MOCK_PATH_MARKER.test(rel)) found.add(`file name ${rel}`)
      if (file.endsWith('.map')) {
        try {
          const map = JSON.parse(readFileSync(file, 'utf8')) as { sources?: string[] }
          for (const source of map.sources ?? [])
            if (MOCK_PATH_MARKER.test(source)) found.add(`source ${source} in ${rel}`)
        } catch {
          // not a JSON map: ignore
        }
        continue
      }
      if (!TEXT_EXTENSIONS.test(file) || statSync(file).size > MAX_SCAN_BYTES) continue
      const text = readFileSync(file, 'utf8')
      for (const marker of MOCK_CONTENT_MARKERS) if (text.includes(marker)) found.add(`"${marker}" in ${rel}`)
    }
  }
  if (options.profile === 'production') {
    for (const hit of found) add(`mock code in a production-profile build: ${hit}`)
    const pages = readJson(join(dist, 'app-path-routes-manifest.json')) as Record<string, string>
    for (const route of MOCK_ROUTES) {
      if (Object.values(pages).includes(route) || Object.keys(pages).includes(`${route}/route`)) {
        add(`mock-only route ${route} exists in a production-profile build`)
      }
    }
    return
  }
  // Mock profile positive control: once the mock layer exists, its sentinel must be visible to this scanner.
  if (
    existsSync(join(options.webRoot, 'src', 'lib', 'mock')) &&
    !found.has(`"${MOCK_SENTINEL}"`) &&
    ![...found].some((hit) => hit.startsWith(`"${MOCK_SENTINEL}"`))
  ) {
    add(
      `mock-profile build does not contain the sentinel ${MOCK_SENTINEL}: the sentinel was renamed or the scanner is blind. Export it from src/lib/mock/sentinel.ts`,
    )
  }
}

// ---------- secrets ----------

function checkSecrets(options: Options, dist: string, findings: Finding[]) {
  const add = (message: string) => findings.push({ check: 'secrets', message })
  const env = options.env ?? {}
  const values = SERVER_ENV_NAMES.map((name) => [name, env[name]] as const).filter(
    (entry): entry is readonly [string, string] => typeof entry[1] === 'string' && entry[1].length >= 8,
  )
  const reported = new Set<string>()
  for (const file of textFiles(join(dist, 'static'))) {
    const rel = posix(relative(dist, file))
    const text = readFileSync(file, 'utf8')
    for (const name of text.match(SECRET_PUBLIC_NAME) ?? []) {
      if (!reported.has(`${name}|${rel}`)) {
        reported.add(`${name}|${rel}`)
        add(`${name} appears in client bundle ${rel}: a NEXT_PUBLIC_ variable with a secret-looking name`)
      }
    }
    for (const name of SERVER_ENV_NAMES) {
      if (text.includes(name)) add(`server-only variable name ${name} appears in client bundle ${rel}`)
    }
    for (const [name, value] of values) {
      if (text.includes(value)) add(`the value of ${name} appears in client bundle ${rel}`)
    }
  }
}

// ---------- CSP ----------

function checkCsp(dist: string, findings: Finding[]) {
  const add = (message: string) => findings.push({ check: 'csp', message })
  const files = [
    ...textFiles(join(dist, 'static')),
    ...textFiles(join(dist, 'server')).filter((file) => /\.(?:html?|meta)$/.test(file)),
    ...['routes-manifest.json'].map((name) => join(dist, name)).filter((file) => existsSync(file)),
  ]
  for (const file of files) {
    if (readFileSync(file, 'utf8').includes('unsafe-eval')) add(`'unsafe-eval' found in ${posix(relative(dist, file))}`)
  }
}

// ---------- noindex ----------

function checkNoindex(options: Options, dist: string, findings: Finding[], groups: Map<string, string>) {
  const add = (message: string) => findings.push({ check: 'noindex', message })
  for (const group of new Set(groups.values())) {
    if (group === 'public') continue
    const layout = join(options.webRoot, 'src', 'app', `(${group})`, 'layout.tsx')
    const source = existsSync(layout) ? readFileSync(layout, 'utf8') : ''
    if (!/NOINDEX_METADATA|index\s*:\s*false/.test(source))
      add(`(${group})/layout.tsx does not set noindex metadata (ARCH-001 17.4)`)
  }
  const env = options.env ?? {}
  if (options.profile !== 'production') return
  const onProductionTarget = (env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV) === 'production'
  if (!onProductionTarget) return
  const manifest = readJson(join(dist, 'routes-manifest.json')) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[]
  }
  for (const rule of manifest.headers ?? []) {
    for (const header of rule.headers) {
      if (header.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(header.value) && rule.source === '/:path*') {
        add(
          'every route carries X-Robots-Tag noindex in a production target build: the public site would be de-indexed (ARCH-001 18.1)',
        )
      }
    }
  }
  // Error pages (404 / _not-found / 500 / _global-error) are meant to be noindex: Next adds it itself and the root layout
  // defaults to it. Only real public pages must be indexable.
  const errorPage = /(^|\/)(_not-found|404|500|_global-error|_error)\.html$/
  for (const file of textFiles(join(dist, 'server')).filter((f) => /\.html$/.test(f) && !errorPage.test(posix(f)))) {
    if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(readFileSync(file, 'utf8'))) {
      add(`prerendered ${posix(relative(dist, file))} carries <meta robots noindex> in a production target build`)
    }
  }
}

// ---------- entry ----------

export function checkBuildOutput(options: Options): Finding[] {
  const findings: Finding[] = []
  const dist = options.distDir ?? join(options.webRoot, '.next')
  const env = options.env ?? {}
  for (const required of ['prerender-manifest.json', 'app-path-routes-manifest.json', 'routes-manifest.json']) {
    if (!existsSync(join(dist, required))) {
      return [{ check: 'routes', message: `${posix(join(dist, required))} is missing: run \`next build\` first` }]
    }
  }
  if (options.profile === 'mock') {
    for (const problem of checkBuildEnv(env)) findings.push({ check: 'profile', message: `mock profile: ${problem}` })
  }
  const groups = checkRoutes(options, dist, findings)
  checkHandoff(options, dist, findings, groups)
  checkMocks(options, dist, findings)
  checkSecrets(options, dist, findings)
  checkCsp(dist, findings)
  checkNoindex(options, dist, findings, groups)
  return findings
}

// ---------- CLI ----------

async function main() {
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  // Same .env loading order as guard-env.ts so a standalone `npm run check:build-output` sees the build's variables.
  for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const path = resolve(process.cwd(), file)
    if (existsSync(path)) process.loadEnvFile(path)
  }
  const resolved = resolveProfile(process.env)
  if (resolved.profile === undefined) {
    console.error(`check-build-output: ${resolved.error ?? 'could not resolve the profile'}`)
    process.exit(1)
  }
  const { ROUTES } = (await import(pathToFileURL(join(webRoot, 'src', 'lib', 'routes', 'routes.ts')).href)) as {
    ROUTES: readonly RegistryRoute[]
  }
  const findings = checkBuildOutput({ webRoot, profile: resolved.profile, env: process.env, registry: ROUTES })
  if (findings.length > 0) {
    console.error(`check-build-output (${resolved.profile} profile) failed:`)
    for (const finding of findings) console.error(`  - [${finding.check}] ${finding.message}`)
    process.exit(1)
  }
  console.log(`check-build-output: ok (${resolved.profile} profile)`)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
