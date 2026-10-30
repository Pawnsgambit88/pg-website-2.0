import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// Throwaway project trees for the architecture-lint tests (TASK-121). Files are written to the OS temp directory, never
// into the repository, so a deliberately broken fixture cannot be picked up by `npm run check:deps` or `tsc`.

export interface TempProject {
  root: string
  write(files: Record<string, string>): void
  cleanup(): void
}

export function createTempProject(prefix: string): TempProject {
  const root = mkdtempSync(join(tmpdir(), `pg-${prefix}-`))
  const write = (files: Record<string, string>) => {
    for (const [rel, content] of Object.entries(files)) {
      const full = join(root, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, content)
    }
  }
  return { root, write, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

/** Minimal stand-ins for the packages the rules name, so dependency-cruiser can resolve them without installing. */
export const FAKE_PACKAGES: Record<string, string> = {
  'node_modules/server-only/package.json': '{"name":"server-only","version":"0.0.1","main":"index.js"}',
  'node_modules/server-only/index.js': 'module.exports = {}\n',
  'node_modules/next/package.json': '{"name":"next","version":"0.0.0"}',
  'node_modules/next/headers.js': 'module.exports = {}\n',
  'node_modules/@radix-ui/react-dialog/package.json':
    '{"name":"@radix-ui/react-dialog","version":"0.0.0","main":"index.js"}',
  'node_modules/@radix-ui/react-dialog/index.js': 'module.exports = {}\n',
  'node_modules/@tanstack/react-query/package.json':
    '{"name":"@tanstack/react-query","version":"0.0.0","main":"index.js"}',
  'node_modules/@tanstack/react-query/index.js': 'module.exports = {}\n',
  'package.json':
    '{"name":"fixture","version":"0.0.0","dependencies":{"server-only":"0.0.1","next":"0.0.0","@radix-ui/react-dialog":"0.0.0","@tanstack/react-query":"0.0.0"}}',
  'tsconfig.json':
    '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]},"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler","allowImportingTsExtensions":true}}',
}
