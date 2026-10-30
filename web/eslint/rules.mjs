// Project lint rule building blocks (TASK-008; ARCH-001 6.2 module rules M1-M13, 17.1, A.3-A.8).
// Pure data, no custom plugin. Every rule here has a failing and a passing case in src/test/lint/rules.test.ts,
// which lints snippets through the real eslint.config.mjs.
//
// `no-restricted-syntax`, `no-restricted-imports` and `no-restricted-globals` are REPLACED (not merged) when a later
// config object sets them, so eslint.config.mjs builds the full list per folder with the builders below.

const syntax = (selector, message) => ({ selector, message })

// esquery regex literal `/source/flags`. Its grammar cannot contain a `/`, so every slash (escaped or not) becomes \x2f.
const re = (regex) => `/${regex.source.replace(/\\?\//g, '\\x2f')}/${regex.flags}`

// ---------- M2 / RBP bundle-barrel-imports: no barrels, no third-party barrel roots ----------

const BARREL =
  'No barrel files (ARCH-001 M2, RBP bundle-barrel-imports). Import the module that defines the symbol, by path.'
const ICONS = 'No icon packages. Use the in-house modules under @/components/ui/icons, one per file (ARCH-001 13.4).'

const THIRD_PARTY_BARRELS = [
  [
    'radix-ui',
    'Use per-package imports such as @radix-ui/react-dialog. The unified radix-ui package is a barrel (ARCH-001 5.1).',
  ],
  ['lucide-react', ICONS],
  ['@radix-ui/react-icons', ICONS],
  ['@heroicons/react', ICONS],
  ['@tabler/icons-react', ICONS],
  ['@mui/icons-material', ICONS],
  ['@mui/material', 'Barrel package root. Not part of the stack.'],
  ['@headlessui/react', 'Use per-package Radix primitives (ARCH-001 5.1).'],
  ['lodash', 'Barrel package root. Use native JS (RBP js-*).'],
  ['lodash-es', 'Barrel package root. Use native JS (RBP js-*).'],
  ['ramda', 'Barrel package root. Use native JS (RBP js-*).'],
  ['rxjs', 'Barrel package root. Not part of the stack.'],
  ['react-use', 'Barrel package root. Write the hook under @/lib/hooks.'],
  ['date-fns', 'Barrel package root. Format through @/lib/format (IST, deterministic).'],
  ['axios', 'HTTP is fetch only, through the PgApi layer (ARCH-001 5.1).'],
]

const BARREL_PATHS = [
  ...['.', '..', './', '../'].map((name) => ({ name, message: BARREL })),
  ...THIRD_PARTY_BARRELS.map(([name, message]) => ({ name, message })),
]

const BARREL_PATTERNS = [
  { group: ['**/index', '**/index.{ts,tsx,js,jsx,mjs}'], message: BARREL },
  { group: ['react-icons', 'react-icons/**'], message: ICONS },
]

// M1: `./x` anywhere; `../x` (one level up) only inside features/<name>; everything else uses `@/`.
const PARENT_ALL = {
  group: ['../**'],
  message:
    'Parent-relative imports are only allowed one level up inside features/<name>. Use the @/ alias (ARCH-001 M1).',
}
const PARENT_DEEP = {
  group: ['../../**'],
  message: 'Cross-folder imports use the @/ alias; only ./x and ../x inside a feature are allowed (ARCH-001 M1).',
}

// M7: components, features and routes never import the mock or the real adapter.
const MOCK_PATTERN = {
  group: ['@/lib/mock/**', '**/lib/mock/**', '@/lib/api/adapters/real', '**/lib/api/adapters/real'],
  message:
    'Components, features and routes never import lib/mock or adapters/real. Get PgApi from getPublicApi() or useApi(), the only adapter entry points (ARCH-001 M7).',
}

// DEC-029 constraint 8: `gsap` is an allow-listed, lazy-only dependency. Only the motion island folder
// (src/components/ui/motion/gsap/**) may import it, and only the core entry (`gsap`), never a subpath such as
// `gsap/all` or `gsap/ScrollTrigger` (constraint 4: plugins need an ADR amendment). Mirrored in .dependency-cruiser.cjs.
export const GSAP_ALLOWED_FILES = ['src/components/ui/motion/gsap/**/*.{ts,tsx}']
const GSAP_MESSAGE =
  'gsap may be imported only from src/components/ui/motion/gsap/** (DEC-029). Mark elements with data-motion and let the HomeMotion island animate them; elsewhere use Reveal.'
const GSAP_SUBPATH_MESSAGE =
  "Only the gsap core entry is approved: import { gsap } from 'gsap'. Plugins and gsap/all need an amendment to DEC-029."
const GSAP_PATH = { name: 'gsap', message: GSAP_MESSAGE }
const GSAP_SUBPATH_PATTERN = { group: ['gsap/**'], message: GSAP_SUBPATH_MESSAGE }

/** @param {{ parent?: 'all' | 'deep' | 'none', mock?: boolean, gsap?: 'deny' | 'core' }} options */
export function restrictedImports({ parent = 'all', mock = false, gsap = 'deny' } = {}) {
  const patterns = [...BARREL_PATTERNS, GSAP_SUBPATH_PATTERN]
  if (parent === 'all') patterns.push(PARENT_ALL)
  if (parent === 'deep') patterns.push(PARENT_DEEP)
  if (mock) patterns.push(MOCK_PATTERN)
  const paths = gsap === 'deny' ? [...BARREL_PATHS, GSAP_PATH] : BARREL_PATHS
  return ['error', { paths, patterns }]
}

// ---------- globals ----------

export function restrictedGlobals({ fetch = false } = {}) {
  const storage = ['localStorage', 'sessionStorage'].map((name) => ({
    name,
    message: 'Browser storage goes through @/lib/storage/versioned (ARCH-001 A.3, RBP client-localstorage-schema).',
  }))
  const list = fetch
    ? [
        ...storage,
        {
          name: 'fetch',
          message: 'Components, features and routes never call fetch. Use getPublicApi() or useApi() (ARCH-001 M7).',
        },
      ]
    : storage
  return ['error', ...list]
}

// ---------- no-restricted-syntax ----------

// M2 / M12
const MODULE_SYNTAX = [
  syntax(
    'ExportAllDeclaration',
    'No `export * from`: that is a barrel (ARCH-001 M2). Import the defining module instead.',
  ),
  syntax(
    "ExportNamedDeclaration[source][exportKind!='type']",
    'No `export { x } from`: that is a barrel (ARCH-001 M2). Import the defining module instead.',
  ),
  syntax(
    "ImportExpression:not([source.type='Literal'])",
    'Dynamic imports use a literal path (ARCH-001 M12, RBP bundle-analyzable-paths).',
  ),
]

// Browser floor (ARCH-001 5.2)
const FLOOR_SYNTAX = [
  syntax(
    "MemberExpression[object.name='Promise'][property.name='withResolvers']",
    'Promise.withResolvers is above the browser floor (ARCH-001 5.2).',
  ),
  syntax(
    "MemberExpression[object.name='Array'][property.name='fromAsync']",
    'Array.fromAsync is above the browser floor (ARCH-001 5.2).',
  ),
  syntax(
    "MemberExpression[object.name='Intl'][property.name='DurationFormat']",
    'Intl.DurationFormat is above the browser floor (ARCH-001 5.2).',
  ),
  syntax(
    "MemberExpression[object.name='AbortSignal'][property.name='any']",
    'AbortSignal.any is above the browser floor. Use the combiner in lib/api/http.ts (ARCH-001 5.2).',
  ),
]

// Non-React HTML sinks (ARCH-001 17.1, SEC-001 F-14). `eval` / `new Function` are covered by no-eval / no-new-func.
const SINK_SYNTAX = [
  syntax(
    "AssignmentExpression[left.type='MemberExpression'][left.property.name=/^(innerHTML|outerHTML)$/]",
    'innerHTML/outerHTML are banned: content is rendered as inert text by React (ARCH-001 17.1).',
  ),
  syntax("CallExpression[callee.property.name='insertAdjacentHTML']", 'insertAdjacentHTML is banned (ARCH-001 17.1).'),
  syntax(
    "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
    'document.write is banned (ARCH-001 17.1).',
  ),
  syntax(
    "CallExpression[callee.object.name='document'][callee.property.name='createElement'][arguments.0.value=/^(script|iframe)$/i]",
    'Creating <script>/<iframe> elements is banned (ARCH-001 17.1).',
  ),
  syntax(
    'JSXOpeningElement[name.name=/^(script|iframe)$/]',
    'Raw <script>/<iframe> in JSX is banned. Third-party scripts load only through reviewed loaders (ARCH-001 17.1).',
  ),
]

// M11 / A.7: tokens only. Hex colours and arbitrary values in class strings. A CSS variable is allowed
// (`pb-[var(--sticky-h)]`, ARCH-001 13.6). Other bracket syntax (grid-cols-[...], data-[state=open]:, aspect-[...]) is
// outside M11. scripts/check-tokens.ts (npm run check:tokens) scans the same ground over all files, including CSS.
const HEX_IN_CLASS = /\[#[0-9a-f]{3,8}\]/i
const ARBITRARY_PREFIX =
  '(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|inset(?:-[xy])?|top|right|bottom|left|' +
  'basis|bg|text|border(?:-[xytrbl])?|ring|outline|fill|stroke|shadow|from|via|to|rounded(?:-[a-z]{1,2})?|leading|tracking|z)'
const ARBITRARY_VALUE = new RegExp(`(?<![\\w-])-?${ARBITRARY_PREFIX}-\\[(?!var\\(--)[^\\]]+\\]`)
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i

const HEX_MESSAGE = 'Raw hex colours in classes are banned. Use a colour token from the theme (ARCH-001 M11, 13.1).'
const ARBITRARY_MESSAGE =
  'Arbitrary Tailwind values are banned (ARCH-001 M11). Use a token, or a CSS variable such as pb-[var(--sticky-h)].'

const TOKEN_SYNTAX = [
  syntax(`Literal[value=${re(HEX_IN_CLASS)}]`, HEX_MESSAGE),
  syntax(`TemplateElement[value.raw=${re(HEX_IN_CLASS)}]`, HEX_MESSAGE),
  syntax(`Literal[value=${re(ARBITRARY_VALUE)}]`, ARBITRARY_MESSAGE),
  syntax(`TemplateElement[value.raw=${re(ARBITRARY_VALUE)}]`, ARBITRARY_MESSAGE),
  syntax(
    `JSXAttribute[name.name='style'] Literal[value=${re(RAW_COLOUR)}]`,
    'Raw colours in inline styles are banned. Use a token (ARCH-001 M11).',
  ),
  syntax(
    `Literal[value=${re(/(?<![\w-])(?:min-|max-)?h-screen(?![\w-])|\b100vh\b/)}]`,
    'No 100vh / h-screen. Use dvh or svh where a height is needed (ARCH-001 13.6).',
  ),
]

// ---------- Server / client boundary (M6, M9) ----------

const CLIENT_FILE = "Program:has(> ExpressionStatement[directive='use client'])"
const SERVER_FILE = "Program:not(:has(> ExpressionStatement[directive='use client']))"

// Modules that must never reach the browser bundle.
const SERVER_ONLY_SOURCE =
  /^(?:server-only|next\/headers)$|(?:^|\/)lib\/(?:data\/public|api\/server|revalidate)(?:\/|$)|(?:^|\/)lib\/env\/env\.server(?:\.[jt]sx?)?$|\.server(?:\.[jt]sx?)?$/

// Browser-only modules. A Server Component cannot use them.
const BROWSER_ONLY_SOURCE =
  /(?:^|\/)lib\/(?:hooks|api\/browser|storage)(?:\/|$)|(?:^|\/)lib\/mock\/store\.browser(?:\.[jt]sx?)?$|\.browser(?:\.[jt]sx?)?$/

const CLIENT_BOUNDARY_SYNTAX = [
  syntax(
    `${CLIENT_FILE} ImportDeclaration[importKind!='type'][source.value=${re(SERVER_ONLY_SOURCE)}]`,
    "A 'use client' module may not import a server-only module (server-only, next/headers, lib/data/public, lib/api/server, env.server, lib/revalidate, *.server). Pass data in as props from a Server Component (ARCH-001 M6).",
  ),
]

// Only for src/app, where pages, layouts and route handlers are Server by default.
const CLIENT_HOOKS =
  /^use(?:State|Reducer|Effect|LayoutEffect|InsertionEffect|Ref|ImperativeHandle|SyncExternalStore|Transition|DeferredValue|Optimistic|ActionState|FormStatus)$/
const SERVER_ENTRY_SYNTAX = [
  syntax(
    `${SERVER_FILE} > ImportDeclaration[importKind!='type'][source.value=${re(BROWSER_ONLY_SOURCE)}]`,
    "A Server Component may not import browser-only modules (lib/hooks, lib/api/browser, lib/storage, *.browser). Move the call into a 'use client' leaf island (ARCH-001 M6, M9).",
  ),
  syntax(
    `${SERVER_FILE} CallExpression[callee.name=${re(CLIENT_HOOKS)}]`,
    "State, effects, refs and transitions need 'use client'. Add it to a small leaf island, not to the page (ARCH-001 M9).",
  ),
]

const STORAGE_MEMBER_SYNTAX = [
  syntax(
    'MemberExpression[object.name=/^(window|globalThis|self)$/][property.name=/^(localStorage|sessionStorage)$/]',
    'Browser storage goes through @/lib/storage/versioned (ARCH-001 A.3).',
  ),
]

const FETCH_MEMBER_SYNTAX = [
  syntax(
    "CallExpression[callee.type='MemberExpression'][callee.object.name=/^(window|globalThis|self)$/][callee.property.name='fetch']",
    'Components, features and routes never call fetch. Use getPublicApi() or useApi() (ARCH-001 M7).',
  ),
]

// DEC-029: no-restricted-imports does not see `import()` or `require()`, and the island loads gsap dynamically, so the
// same allow-list is enforced on those call forms here. 'deny' bans every gsap specifier; 'core' (the island folder)
// bans subpaths only.
const GSAP_ANY = /^gsap(?:\/|$)/
const GSAP_SUB = /^gsap\//
const gsapSyntax = (source, message) => [
  syntax(`ImportExpression[source.value=${re(source)}]`, message),
  syntax(`CallExpression[callee.name='require'][arguments.0.value=${re(source)}]`, message),
]
const GSAP_DENY_SYNTAX = gsapSyntax(GSAP_ANY, GSAP_MESSAGE)
const GSAP_CORE_SYNTAX = gsapSyntax(GSAP_SUB, GSAP_SUBPATH_MESSAGE)

/** @param {{ fetch?: boolean, serverEntry?: boolean, storage?: boolean, gsap?: 'deny' | 'core' }} options */
export function restrictedSyntax({ fetch = false, serverEntry = false, storage = true, gsap = 'deny' } = {}) {
  return [
    'error',
    ...MODULE_SYNTAX,
    ...(gsap === 'deny' ? GSAP_DENY_SYNTAX : GSAP_CORE_SYNTAX),
    ...FLOOR_SYNTAX,
    ...SINK_SYNTAX,
    ...TOKEN_SYNTAX,
    ...CLIENT_BOUNDARY_SYNTAX,
    ...(storage ? STORAGE_MEMBER_SYNTAX : []),
    ...(fetch ? FETCH_MEMBER_SYNTAX : []),
    ...(serverEntry ? SERVER_ENTRY_SYNTAX : []),
  ]
}

// M2: an `index` module is itself a barrel. Applied with `files: INDEX_FILES`.
export const INDEX_FILES = ['src/**/index.{ts,tsx,js,jsx,mjs}']
export const NO_INDEX_FILE = [
  'error',
  syntax('Program', 'No index files: they become barrels (ARCH-001 M2). Name the module after what it defines.'),
]
