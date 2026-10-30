/* Architecture lint (TASK-121; ARCH-001 6.2 M3 to M6, SEC-001 F-04). Run with `npm run check:deps`.
 *
 * What dependency-cruiser enforces here: import-graph rules (who may import whom, transitively where the rule says so).
 * What it cannot see (file CONTENT) is checked by scripts/check-module-directives.ts, which also runs under
 * `check:deps`: M6 "starts with import 'server-only'" / "'use client'", the transitive client-to-server-only walk keyed
 * on the real 'use client' directive, and the M13 slug-validation scan of dynamic (public) pages.
 *
 * Type-only imports are erased (tsPreCompilationDeps: false), so they never count as a dependency: they cost nothing at
 * runtime and cannot leak server code to a bundle.
 *
 * Tests (*.test.*, src/test/**) are outside the graph: they deliberately import across boundaries.
 * Every rule has a failing fixture in scripts/arch-lint.test.ts that runs this very file.
 */

// Modules that must never reach a browser bundle (M6). scripts/check-module-directives.ts has the same list in code
// form; scripts/arch-lint.test.ts asserts the two agree.
const SERVER_ONLY =
  '^src/lib/(data/public|api/server|revalidate)/|^src/lib/env/env\\.server\\.ts$|^src/lib/api/adapters/index\\.server\\.ts$|\\.server\\.tsx?$|^node_modules/(server-only|next/headers)(\\.|/|$)'

// Client-only roots by location (M6). A module here without the directive must still be client-safe.
const CLIENT_ROOTS =
  '^src/features/|^src/lib/(api/browser|query)/|^src/lib/mock/store\\.browser\\.tsx?$|^src/lib/api/adapters/index\\.browser\\.tsx?$'

const PUBLIC = '^src/app/\\(public\\)/'

// The one overlay module the (public) mobile menu island may use (ARCH-001 M3). Narrow on purpose: one file.
const MENU_ISLAND_OVERLAY = '^src/components/ui/overlay/Sheet\\.tsx?$'

// Radix overlay packages (M3): dialogs, popovers, menus, selects, tooltips, toasts and their internals.
const RADIX_OVERLAYS =
  '^node_modules/@radix-ui/react-(dialog|alert-dialog|popover|dropdown-menu|context-menu|hover-card|menubar|navigation-menu|select|tooltip|toast|dismissable-layer|focus-scope|portal|popper)(/|$)'

// Token and session code (SEC-001 F-04): public pages stay in the weakest-CSP class and must not ship it.
// The whole browser API folder (token store, session lock, step-up, auth transport, client) and every lib/auth module
// EXCEPT the non-secret session hint (lib/auth/session-hint, ARCH-001 12.2) are banned, even transitively.
const TOKEN_AND_AUTH =
  '^src/lib/api/browser/|^src/lib/auth/|^src/features/auth/|^src/components/layout/(PlayerShell|AdminShell)\\.tsx?$'
const SESSION_HINT = '^src/lib/auth/session-hint\\.tsx?$'

const TESTS = '\\.test\\.tsx?$|^src/test/'

// DEC-029: the gsap package and the files its bare `gsap` specifier resolves to (package.json `module` / `main`).
const GSAP = '^node_modules/gsap/'
const GSAP_CORE_ENTRY = '^node_modules/gsap/(index\\.js|dist/gsap(\\.min)?\\.js)$'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---------- General hygiene ----------
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports break tree-shaking order and make module initialisation order fragile.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'An import that does not resolve is a build error waiting to happen.',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Application code may only import packages listed under dependencies.',
      from: { path: '^src', pathNot: TESTS },
      to: { dependencyTypes: ['npm-dev'] },
    },
    {
      name: 'not-to-app-from-shared',
      severity: 'error',
      comment: 'components, features and lib never import from app/ (routes are leaves of the graph).',
      from: { path: '^src/(components|features|lib)/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'A module nothing imports is dead code or a missing import. Warning only: the scaffold has primitives that later tasks consume.',
      from: {
        orphan: true,
        path: '^src/(components|features|lib)/',
        pathNot: ['\\.d\\.ts$', TESTS],
      },
      to: {},
    },

    // ---------- M3: (public) isolation (F-04) ----------
    {
      name: 'm3-public-no-features',
      severity: 'error',
      comment: 'M3: (public) code may not reach features/*, even transitively. Features are client-heavy slices.',
      from: { path: PUBLIC },
      to: { path: '^src/features/', reachable: true },
    },
    {
      name: 'm3-public-no-query',
      severity: 'error',
      comment:
        'M3: no TanStack Query (lib/query, @tanstack/*) in (public), even transitively. Query stays out of the public bundle (AC-98); the availability island uses a small fetch hook instead.',
      from: { path: PUBLIC },
      to: { path: '^src/lib/query/|^node_modules/@tanstack/', reachable: true },
    },
    {
      name: 'm3-public-no-mock-store',
      severity: 'error',
      comment:
        'M3: (public) code never imports the browser mock store (lib/mock/store.browser). Direct imports only: the server mock adapter is reached through getPublicApi() and dead-code-eliminated in production (ARCH-001 11.3).',
      from: { path: PUBLIC },
      to: { path: '^src/lib/mock/store\\.browser\\.tsx?$' },
    },
    {
      name: 'm3-public-no-token-or-auth-code',
      severity: 'error',
      comment:
        'M3 / SEC-001 F-04: everything under lib/api/browser (token store, session lock, step-up, auth transport, client), the other lib/auth modules and the signed-in shells are banned from (public), even transitively. The only allowed auth module is the non-secret lib/auth/session-hint (ARCH-001 12.2).',
      from: { path: PUBLIC },
      to: { path: TOKEN_AND_AUTH, pathNot: SESSION_HINT, reachable: true },
    },
    {
      name: 'f04-session-hint-isolated',
      severity: 'error',
      comment:
        'SEC-001 F-04: lib/auth/session-hint is the one auth module (public) code may use, so it must stay clean: it may not reach lib/api/browser (token store), features or the signed-in shells, even transitively. Otherwise the allow-list above would be a back door.',
      from: { path: SESSION_HINT },
      to: {
        path: '^src/lib/api/browser/|^src/features/|^src/components/layout/(PlayerShell|AdminShell)\\.tsx?$',
        reachable: true,
      },
    },
    {
      name: 'm3-public-no-overlays',
      severity: 'error',
      comment:
        'M3: no overlay primitives (components/ui/overlay/*: Dialog, Popover, Select, Tooltip, Toast) in (public), even transitively. The single exception is the mobile menu island, which may use components/ui/overlay/Sheet.',
      from: { path: PUBLIC },
      to: { path: '^src/components/ui/overlay/', pathNot: MENU_ISLAND_OVERLAY, reachable: true },
    },
    {
      name: 'm3-public-no-form-select',
      severity: 'error',
      comment:
        'M3: the Radix Select form control (components/ui/form/Select) carries overlay code, so (public) must not reach it, even transitively. Public forms (Contact) use native controls or Input/Textarea only.',
      from: { path: PUBLIC },
      to: { path: '^src/components/ui/form/Select\\.tsx?$', reachable: true },
    },
    {
      name: 'm3-radix-overlays-only-in-ui-overlay',
      severity: 'error',
      comment:
        'M3: Radix overlay packages are imported only by components/ui/overlay/*. This makes the (public) overlay rule airtight: reaching Radix overlay code means reaching an overlay module.',
      // Select is a form control whose listbox popover is built on Radix Select. It stays in components/ui/form and is the
      // single allowed exception outside overlay/ (owner-approved 2026-10-23). The (public) group must still never reach
      // it: m3-public-no-form-select below enforces that, even transitively.
      from: { path: '^src', pathNot: ['^src/components/ui/overlay/', '^src/components/ui/form/Select\\.tsx?$', TESTS] },
      to: { path: RADIX_OVERLAYS },
    },
    {
      name: 'm3-public-no-server-plumbing',
      severity: 'error',
      comment:
        'M3 / M13: (public) pages reach the backend only through lib/data/public/* (slug-validated, tagged, cached). Not serverGet, not an adapter, not the mock.',
      from: { path: PUBLIC },
      to: { path: '^src/lib/(api/server|api/adapters|mock)/' },
    },

    // ---------- DEC-029: gsap allow-list (mirrors the ESLint no-restricted-imports rule) ----------
    {
      name: 'dec029-gsap-only-in-motion-island',
      severity: 'error',
      comment:
        'DEC-029 constraint 8: gsap is imported only by src/components/ui/motion/gsap/** (the lazy HomeMotion island). Everything else marks elements with data-motion or uses Reveal. Covers static and dynamic imports.',
      from: { path: '^src', pathNot: ['^src/components/ui/motion/gsap/', TESTS] },
      to: { path: GSAP },
    },
    {
      name: 'dec029-gsap-core-only',
      severity: 'error',
      comment:
        'DEC-029 constraint 4: only the gsap core entry is approved (no ScrollTrigger, no gsap/all, no other plugin) until the ADR is amended with a measured budget.',
      from: { path: '^src/components/ui/motion/gsap/' },
      to: { path: GSAP, pathNot: GSAP_CORE_ENTRY },
    },

    // ---------- M4: feature isolation ----------
    {
      name: 'm4-no-cross-feature',
      severity: 'error',
      comment: 'M4: features/<a> may not import features/<b>. Move the shared code to components/ or lib/.',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },

    // ---------- M5: route-group isolation ----------
    {
      name: 'm5-no-cross-group',
      severity: 'error',
      comment:
        'M5: a route group imports only its own folder, components/, features/ (client groups) and lib/. Never another group.',
      from: { path: '^src/app/\\(([^)]+)\\)/' },
      to: { path: '^src/app/\\(([^)]+)\\)/', pathNot: '^src/app/\\($1\\)/' },
    },

    // ---------- M6: server/client boundary (graph part; content part is check-module-directives.ts) ----------
    {
      name: 'm6-client-roots-no-server-only',
      severity: 'error',
      comment:
        'M6: modules in client-only locations (features, lib/query, lib/api/browser, the browser mock store and browser adapter entry) may not reach a server-only module, even transitively. The directive-based walk in check-module-directives.ts covers every other file that carries "use client".',
      from: { path: CLIENT_ROOTS },
      to: { path: SERVER_ONLY, reachable: true },
    },
    {
      name: 'm6-browser-helpers-no-server-only',
      severity: 'error',
      comment: 'M6: browser-only helper folders (lib/hooks, lib/storage) never import a server-only module.',
      from: { path: '^src/lib/(hooks|storage)/' },
      to: { path: SERVER_ONLY },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    // Frameworks are not application code (TASK-121 notes). next/headers stays visible: it is server-only (M6).
    exclude: {
      path: [TESTS, '^node_modules/(react|react-dom|scheduler)/'],
    },
    // The unresolved alternatives keep `not-to-unresolvable` working: an unresolved import has no src/ path.
    includeOnly: '^(src|node_modules)|^\\.{1,2}/|^@/',
    tsPreCompilationDeps: false,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
}
