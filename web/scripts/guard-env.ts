// Runs as `prebuild`. Node 22.18+/24 strips types natively, so no extra tooling is needed.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkBuildEnv } from '../src/lib/env/guard.ts'

// `prebuild` runs before Next loads .env files, so load them here in Next's precedence order.
// process.loadEnvFile never overrides variables that are already set.
for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  const path = resolve(process.cwd(), file)
  if (existsSync(path)) process.loadEnvFile(path)
}

const problems = checkBuildEnv(process.env)
if (problems.length > 0) {
  console.error('Build environment guard failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log('guard-env: ok')
