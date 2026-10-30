// `npm run analyze`: emits the @next/bundle-analyzer report to .next/analyze/{client,nodejs,edge}.html.
// The plugin only works on webpack builds (it is a no-op under Turbopack, the Next 16 default),
// so this runs `next build --webpack` with ANALYZE=true. Cross-platform: no inline env syntax.
// The report is a diagnostic. Budget numbers always come from the default Turbopack build (scripts/measure-baseline.mjs).
// For the Turbopack-native analyzer use `npx next analyze` (interactive) or `npx next analyze --output`.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  stdio: 'inherit',
  env: { ...process.env, ANALYZE: 'true' },
})
process.exit(result.status ?? 1)
