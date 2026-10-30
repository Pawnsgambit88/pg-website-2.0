// Meta description text (TASK-112, ARCH-001 8.1). Pure, no directive.

/** Search engines show about 155 to 160 characters; HOME-PAGE-PLAN section 8 caps descriptions at 160. */
export const META_DESCRIPTION_MAX = 160

const ELLIPSIS = '…'

/**
 * Joins the non-empty parts with a space, collapses whitespace, and shortens the result to at most `max` characters at
 * a word boundary with a trailing ellipsis. Returns `undefined` when nothing is left, so the caller omits the field.
 */
export function metaDescription(
  parts: readonly (string | null | undefined)[],
  max: number = META_DESCRIPTION_MAX,
): string | undefined {
  const text = parts
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text === '') return undefined
  if (text.length <= max) return text
  const room = text.slice(0, max - ELLIPSIS.length)
  const lastSpace = room.lastIndexOf(' ')
  const cut = lastSpace > max / 2 ? room.slice(0, lastSpace) : room
  return `${cut.replace(/[\s,;:.\-–—]+$/, '')}${ELLIPSIS}`
}
