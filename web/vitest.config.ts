import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Two projects (ARCH-001 16.1): `*.test.ts` run in Node (pure logic, env parsing, lint fixtures);
// `*.test.tsx` run in jsdom with Testing Library cleanup and the axe helper (src/test).
// Contract and e2e projects arrive with TASK-092 / TASK-009.
const config = defineConfig({
  resolve: {
    tsconfigPaths: true, // honours the single `@/*` alias from tsconfig.json (M1)
    alias: {
      // `server-only` throws outside a react-server build; tests of server modules import the real file with it stubbed.
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
})

export default config
