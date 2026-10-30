import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Brand colours for generated images (TASK-112 OG card). next/og (Satori) cannot read CSS variables and components may
// not hold raw colours (ARCH-001 M11, check:tokens), so the values are read from the token source of truth,
// src/styles/theme.css, once at module load (RBP server-hoist-static-io). The OG routes are prerendered at build, where
// the working directory is web/. A missing or renamed token throws, so the build fails instead of drawing off-brand.

const THEME_PATH = join(process.cwd(), 'src', 'styles', 'theme.css')

const TOKENS = ['parchment', 'parchment-soft', 'forest', 'forest-dark', 'copper', 'copper-soft', 'ink'] as const
type BrandToken = (typeof TOKENS)[number]

function readPalette(): Readonly<Record<BrandToken, string>> {
  const css = readFileSync(THEME_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const entries = TOKENS.map((token) => {
    const match = new RegExp(`--color-${token}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)
    const value = match?.[1]
    if (value === undefined) throw new Error(`brand-palette: --color-${token} is not a 6-digit colour in theme.css`)
    return [token, value] as const
  })
  return Object.freeze(Object.fromEntries(entries) as Record<BrandToken, string>)
}

/** Immutable after load: safe to share across requests (RBP server-no-shared-module-state). */
export const BRAND_PALETTE = readPalette()
