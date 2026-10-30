// Measures First Load JS (gzip) per route from .next/diagnostics/route-bundle-stats.json
// (Turbopack production build). Prints JSON; pass --write to merge into budgets.json "baseline".
// TASK-0xx check:bundle will reuse this logic. Plain Node ESM, no dependencies.
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const root = process.cwd()
const stats = JSON.parse(readFileSync(resolve(root, '.next/diagnostics/route-bundle-stats.json'), 'utf8'))
const nextVersion = JSON.parse(readFileSync(resolve(root, 'node_modules/next/package.json'), 'utf8')).version

const routes = {}
for (const entry of stats) {
  let raw = 0
  let gzip = 0
  for (const chunk of entry.firstLoadChunkPaths) {
    const bytes = readFileSync(resolve(root, chunk.replaceAll(String.fromCharCode(92), '/')))
    raw += bytes.length
    gzip += gzipSync(bytes, { level: 9 }).length
  }
  routes[entry.route] = {
    rawBytes: raw,
    gzipBytes: gzip,
    reportedUncompressedBytes: entry.firstLoadUncompressedJsBytes,
  }
}

const result = { next: nextVersion, bundler: 'turbopack', routes }
console.log(JSON.stringify(result, null, 2))

if (process.argv.includes('--write')) {
  const path = resolve(root, 'budgets.json')
  const budgets = JSON.parse(readFileSync(path, 'utf8'))
  budgets.baseline = { ...result, measuredAt: new Date().toISOString().slice(0, 10) }
  writeFileSync(path, JSON.stringify(budgets, null, 2) + '\n')
}
