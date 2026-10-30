// TASK-010: asserts src/styles/theme.css matches "Frontend reference/design-tokens.json" and that source code uses
// tokens only. Node 22.18+/24 strips types natively (same as guard-env.ts), so only erasable TypeScript is used.
//   node scripts/check-tokens.ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jsonPath = resolve(webRoot, '..', 'Frontend reference', 'design-tokens.json')
const themePath = join(webRoot, 'src', 'styles', 'theme.css')
const srcRoot = join(webRoot, 'src')

const problems: string[] = []
const fail = (message: string) => problems.push(message)

const tokens = JSON.parse(readFileSync(jsonPath, 'utf8'))
const themeCss = readFileSync(themePath, 'utf8')
// Strip comments so the header table cannot satisfy an assertion.
const theme = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')

const declarations = new Map<string, string>()
for (const match of theme.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  const name = match[1]
  const value = match[2]
  if (name !== undefined && value !== undefined) declarations.set(name, value.trim().replace(/\s+/g, ' '))
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const norm = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ').trim()

function expect(name: string, expected: string) {
  const actual = declarations.get(name)
  if (actual === undefined) return fail(`theme.css is missing ${name} (expected ${expected})`)
  if (norm(actual) !== norm(expected)) fail(`${name} is "${actual}" but design-tokens.json says "${expected}"`)
}

// Colours
for (const [key, hex] of Object.entries(tokens.colors) as [string, string][]) expect(`--color-${kebab(key)}`, hex)

// Type scale (hero, section: size, line-height, letter-spacing, weight; body: size and line-height; eyebrow, button)
for (const [key, spec] of Object.entries(tokens.type) as [string, Record<string, string | number>][]) {
  const base = `--text-${key}`
  if (spec.size !== undefined) expect(base, String(spec.size).replace(/,\s*/g, ', '))
  if (spec.lineHeight !== undefined) expect(`${base}--line-height`, String(spec.lineHeight))
  if (spec.letterSpacing !== undefined) expect(`${base}--letter-spacing`, String(spec.letterSpacing))
  if (spec.weight !== undefined && key !== 'body') expect(`${base}--font-weight`, String(spec.weight))
}

// Fonts: each family token exists, resolves through the next/font variable and keeps the generic family
const inlineBlock = /@theme\s+inline\s*\{([\s\S]*?)\n\}/.exec(theme)?.[1] ?? ''
for (const [role, spec] of Object.entries(tokens.fonts) as [string, { family: string; fallback: string }][]) {
  const line = new RegExp(`--font-${role}\\s*:\\s*([^;]+);`).exec(inlineBlock)?.[1]
  if (line === undefined) {
    fail(`@theme inline is missing --font-${role} (${spec.family})`)
    continue
  }
  const generic = spec.fallback.split(',').pop()?.trim() ?? ''
  if (!line.includes('var(--font-')) fail(`--font-${role} must resolve to a next/font CSS variable`)
  if (!line.trim().endsWith(generic)) fail(`--font-${role} must end with the generic family "${generic}"`)
}

// Spacing: unit 4px; the approved scale equals multipliers 1/2/3/4/6/8/12/16/24
expect('--spacing', `${tokens.spacingPx[0]}px`)
const approvedMultipliers = [1, 2, 3, 4, 6, 8, 12, 16, 24]
const scale = approvedMultipliers.map((m) => m * 4)
if (JSON.stringify(scale) !== JSON.stringify(tokens.spacingPx)) {
  fail(
    `spacingPx ${JSON.stringify(tokens.spacingPx)} is no longer 4 x ${JSON.stringify(approvedMultipliers)}; update the check`,
  )
}

// Layout
expect('--container-shell', tokens.layout.maxShell)
expect('--spacing-gutter-desktop', tokens.layout.desktopGutter)
expect('--spacing-gutter-mobile', tokens.layout.mobileGutter)
expect('--spacing-sidebar', tokens.layout.playerSidebar)
expect('--spacing-sidebar-admin', tokens.layout.adminSidebar)
expect('--spacing-control', tokens.layout.controlHeight)

// Radius, breakpoints, easing
expect('--radius-public', tokens.radius.public)
expect('--radius-operational', tokens.radius.operationalMax)
const bpNames = ['xs', 'sm', 'md', 'lg', 'xl']
tokens.breakpointsPx.forEach((px: number, i: number) => expect(`--breakpoint-${bpNames[i]}`, `${px}px`))
if (tokens.breakpointsPx.length !== bpNames.length) fail('breakpointsPx length changed; add names to check-tokens.ts')
expect('--ease-brand', tokens.motion.ease.replace(/(^|[(,])\./g, '$10.').replace(/,(?=\S)/g, ', '))

// Motion durations lie inside the documented ranges
const ms = (name: string) => Number.parseInt(declarations.get(name) ?? '', 10)
const range = (text: string) =>
  text
    .match(/(\d+)-(\d+)ms/)
    ?.slice(1)
    .map(Number) as [number, number]
const [controlMin, controlMax] = range(tokens.motion.control)
const [revealMin, revealMax] = range(tokens.motion.editorialReveal)
for (const name of ['--duration-control-fast', '--duration-control', '--duration-control-slow']) {
  if (!(ms(name) >= controlMin && ms(name) <= controlMax)) fail(`${name} must be ${tokens.motion.control}`)
}
for (const name of ['--duration-reveal', '--duration-reveal-slow']) {
  if (!(ms(name) >= revealMin && ms(name) <= revealMax)) fail(`${name} must be ${tokens.motion.editorialReveal}`)
}

// The theme must neutralise default colours so only brand colours exist
if (!/--color-\*\s*:\s*initial/.test(theme)) fail('theme.css must start the colour namespace with --color-*: initial')

// Source scan: tokens only (no hex, rgb()/hsl(), arbitrary colours or arbitrary lengths) outside theme.css
const exts = new Set(['.ts', '.tsx', '.css', '.mdx'])
const skipDirs = new Set(['node_modules', '.next'])
const allowed = new Set([themePath])
const rules: [RegExp, string][] = [
  [/#[0-9a-f]{3,8}\b/gi, 'raw hex colour'],
  [/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/gi, 'raw colour function'],
  [/\b[a-z-]+-\[(?:#|(?:rgba?|hsla?|oklch|color)\()[^\]]*\]/gi, 'arbitrary colour value'],
  [
    /\b(?:[a-z]+:)*(?:-?[mp][trblxyse]?|gap(?:-[xy])?|space-[xy]|size|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset(?:-[xy])?|basis|text|leading|tracking|rounded(?:-[a-z]{1,2})?)-\[-?[\d.]+(?:px|rem|em|vw|vh|svh|dvh|%)\]/g,
    'arbitrary length',
  ],
]

function walk(dir: string, visit: (file: string) => void) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!skipDirs.has(name)) walk(full, visit)
    } else if (exts.has(name.slice(name.lastIndexOf('.')))) {
      visit(full)
    }
  }
}

walk(srcRoot, (file) => {
  if (allowed.has(file)) return
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (/token-check-ignore/.test(line)) return
    for (const [pattern, label] of rules) {
      pattern.lastIndex = 0
      for (const match of line.matchAll(pattern)) {
        // Ignore URL fragments and HTML entities such as &#8212;
        const before = line[(match.index ?? 0) - 1]
        if (
          label === 'raw hex colour' &&
          (before === '&' || /(?:https?:|\/)\S*#/.test(line.slice(0, (match.index ?? 0) + 1)))
        )
          continue
        fail(`${relative(webRoot, file)}:${i + 1}: ${label} "${match[0]}" (use a token)`)
      }
    }
  })
})

if (problems.length > 0) {
  console.error('check-tokens failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(`check-tokens: ok (${declarations.size} theme declarations, source scan clean)`)
