import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import {
  GSAP_ALLOWED_FILES,
  INDEX_FILES,
  NO_INDEX_FILE,
  restrictedGlobals,
  restrictedImports,
  restrictedSyntax,
} from './eslint/rules.mjs'

// TASK-008. eslint-config-next supplies react, react-hooks, import, jsx-a11y (6 rules) and @next/next; this file adds
// the project rule set from ARCH-001 6.2 (M1 to M12), 17.1 and A.3 to A.8. Rule data lives in eslint/rules.mjs.
// Every rule below has a failing and a passing case in src/test/lint/rules.test.ts.
//
// Deferred to dependency-cruiser (TASK-121): M3 to M5 group and feature isolation, M6 "starts with server-only" and
// transitive client-to-server reachability, M13 slug validation, props-serialisability across the boundary.

const SRC = ['src/**/*.{ts,tsx}']
const TESTS = ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}']
const NEXT_SPECIAL = [
  'src/app/**/{page,layout,template,loading,error,global-error,not-found,default,route,sitemap,robots,opengraph-image,twitter-image,icon,apple-icon,manifest}.{ts,tsx}',
  'src/proxy.ts',
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),

  // Accessibility: the full jsx-a11y recommended set (next ships six rules of it).
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
    },
  },

  // Rendering and React correctness (RBP rerender-*, A.6; M10; SEC-001 F-14).
  {
    files: SRC,
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/no-unstable-nested-components': ['error', { allowAsProps: false }],
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-key': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Module rules for all application code: M1, M2, M12, token and sink bans, client/server boundary.
  {
    files: SRC,
    rules: {
      'no-restricted-imports': restrictedImports({ parent: 'all' }),
      'no-restricted-globals': restrictedGlobals(),
      'no-restricted-syntax': restrictedSyntax(),
    },
  },

  // M7: UI and routes never call fetch and never import the mock or adapters. Routes are Server Components by default.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports({ parent: 'all', mock: true }),
      'no-restricted-globals': restrictedGlobals({ fetch: true }),
      'no-restricted-syntax': restrictedSyntax({ fetch: true }),
    },
  },
  // DEC-029: the motion island folder is the only place `gsap` (core entry only) may be imported. Same component rules
  // as above; only the gsap ban is narrowed to subpaths.
  {
    files: GSAP_ALLOWED_FILES,
    rules: {
      'no-restricted-imports': restrictedImports({ parent: 'all', mock: true, gsap: 'core' }),
      'no-restricted-syntax': restrictedSyntax({ fetch: true, gsap: 'core' }),
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      // M1: ../x (one level up) is allowed inside a feature.
      'no-restricted-imports': restrictedImports({ parent: 'deep', mock: true }),
      'no-restricted-globals': restrictedGlobals({ fetch: true }),
      'no-restricted-syntax': restrictedSyntax({ fetch: true }),
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports({ parent: 'all', mock: true }),
      'no-restricted-globals': restrictedGlobals({ fetch: true }),
      'no-restricted-syntax': restrictedSyntax({ fetch: true, serverEntry: true }),
    },
  },
  // lib/ is where fetch, adapters and storage legitimately live (lib/api, lib/storage/versioned).
  {
    files: ['src/lib/api/**/*.{ts,tsx}'],
    rules: { 'no-restricted-globals': restrictedGlobals() },
  },
  {
    files: ['src/lib/storage/versioned.ts'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-syntax': restrictedSyntax({ storage: false }) },
  },

  // M2: an index module is a barrel by construction. Placed after the per-folder objects so it wins.
  { files: INDEX_FILES, rules: { 'no-restricted-syntax': NO_INDEX_FILE } },

  // M8: named exports, one component per file. Next special files and config files may default-export.
  {
    files: SRC,
    ignores: NEXT_SPECIAL,
    rules: { 'import/no-default-export': 'error' },
  },
  {
    files: ['src/components/**/*.tsx', 'src/features/**/*.tsx'],
    rules: { 'react/no-multi-comp': ['error', { ignoreStateless: false }] },
  },

  // M10: the single dangerouslySetInnerHTML site.
  { files: ['src/lib/seo/JsonLd.tsx'], rules: { 'react/no-danger': 'off' } },

  // Tests carry deliberate-violation snippets, so syntax/token bans are off; barrels and a11y stay on.
  {
    files: TESTS,
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
      'react/no-multi-comp': 'off',
      'react/no-unstable-nested-components': 'off',
    },
  },

  // Tooling files are not application code.
  {
    files: ['*.{js,mjs,cjs,ts}', 'scripts/**', 'eslint/**', 'e2e/**'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'import/no-default-export': 'off',
    },
  },
])

export default eslintConfig
