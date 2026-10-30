import type { ContentBlock } from '@/lib/api/types/content-blocks'
import { metaDescription } from '@/lib/seo/description'

// Pure helpers for the legal template: stable heading ids, the table of contents and the meta description.
// Deterministic (same input, same ids) so server HTML and any re-render agree.

export interface LegalTocEntry {
  id: string
  text: string
}

const ID_PREFIX = 'legal-'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * One id per block index: heading blocks get `legal-{slug}` (deduplicated with `-2`, `-3`), every other block
 * `undefined`. Index-aligned with `blocks`, so the renderer and the table of contents read the same ids.
 */
export function headingIds(blocks: readonly ContentBlock[]): readonly (string | undefined)[] {
  const used = new Map<string, number>()
  return blocks.map((block, index) => {
    if (block.type !== 'heading') return undefined
    const base = `${ID_PREFIX}${slugify(block.text) || `section-${index + 1}`}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  })
}

/** Table of contents from the level-2 headings (level 3 stays in the body only, so the list stays short). */
export function tocEntries(blocks: readonly ContentBlock[], ids: readonly (string | undefined)[]): LegalTocEntry[] {
  const entries: LegalTocEntry[] = []
  blocks.forEach((block, index) => {
    const id = ids[index]
    if (block.type === 'heading' && block.level === 2 && id !== undefined) entries.push({ id, text: block.text })
  })
  return entries
}

/** Meta description: the first paragraph, clamped. `undefined` when the page has none. */
export function legalDescription(blocks: readonly ContentBlock[]): string | undefined {
  const first = blocks.find((block) => block.type === 'paragraph')
  return first === undefined ? undefined : metaDescription([first.text])
}
