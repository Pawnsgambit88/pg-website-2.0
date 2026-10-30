/** Semantic heading levels. The visual size is a separate prop on `Heading` (ARCH-001 section 15). */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * The level one step below `level`, capped at 6. Use it so a nested block never skips a level:
 * `<Heading level={2}>` then `<Heading level={nextHeadingLevel(2)}>` gives an h3. A page has exactly one h1.
 */
export function nextHeadingLevel(level: HeadingLevel): HeadingLevel {
  return level >= 6 ? 6 : ((level + 1) as HeadingLevel)
}
