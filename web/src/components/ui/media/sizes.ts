// `sizes` presets and aspect-ratio variants for ResponsiveImage / MediaFrame (TASK-032).
// Source: docs/plans/FEAT-001/ASSET-INVENTORY.md 2.4. The stacking point of the reference layouts is 960 px, so
// "min-width:961px" is the first width at which a two-column slot is side by side. 1512 px is where the 1440 px shell
// plus gutters stops growing, so slot widths become fixed pixels above it. Breakpoints inside `sizes` strings cannot use
// Tailwind tokens (the browser reads them, not the CSS), so they are literals here and nowhere else.

export const ASPECT_RATIOS = ['1:1', '4:3', '3:2', '16:9', '4:5'] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]

/** Numeric width / height, used to pick the nearest local placeholder and for the numeric `aspect-ratio` fallback. */
export const ASPECT_RATIO_VALUE: Readonly<Record<AspectRatio, number>> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '4:5': 4 / 5,
}

/**
 * Tailwind v4 fraction utilities, written out in full so the class scanner finds each one. Never build these names by
 * concatenation (the scanner would not generate them) and never use arbitrary `aspect-[..]` values (M11).
 */
export const ASPECT_CLASS: Readonly<Record<AspectRatio, string>> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-4/3',
  '3:2': 'aspect-3/2',
  '16:9': 'aspect-16/9',
  '4:5': 'aspect-4/5',
}

export const IMAGE_SLOTS = ['hero', 'eventHero', 'card', 'split', 'banner', 'gallery', 'avatar'] as const
export type ImageSlot = (typeof IMAGE_SLOTS)[number]

export interface SlotPreset {
  /** Value of the `sizes` attribute: what width the browser should assume before layout. */
  readonly sizes: string
  /** Ratio used when the caller does not pass one. */
  readonly ratio: AspectRatio
}

export const SLOT_PRESETS: Readonly<Record<ImageSlot, SlotPreset>> = {
  // Home hero, 1.1fr column next to copy. The only eager image on Home (LCP).
  hero: { sizes: '(min-width:1512px) 800px, (min-width:961px) 55vw, 100vw', ratio: '3:2' },
  // Event detail hero (screens 03, 04). The only eager image on that page.
  eventHero: { sizes: '(min-width:961px) 52vw, 100vw', ratio: '4:3' },
  // Event, past-event, story and testimonial cards in a three column grid.
  card: { sizes: '(min-width:1512px) 480px, (min-width:961px) 33vw, 100vw', ratio: '16:9' },
  // Half-width editorial image next to copy: hospitality, community, story. Override `ratio` per section.
  split: { sizes: '(min-width:961px) 48vw, 100vw', ratio: '3:2' },
  // Full-bleed band (final CTA).
  banner: { sizes: '100vw', ratio: '16:9' },
  // Gallery and admin media tiles.
  gallery: { sizes: '(min-width:961px) 20vw, 50vw', ratio: '4:3' },
  // 34 to 44 px circle; the optimiser still needs a width ladder, 96 px covers 2x.
  avatar: { sizes: '96px', ratio: '1:1' },
}

/** Nearest supported ratio for a pixel size (used to choose a placeholder). */
export function nearestAspectRatio(width: number, height: number): AspectRatio {
  if (!(width > 0) || !(height > 0)) return '4:3'
  const target = width / height
  let best: AspectRatio = '4:3'
  let bestDistance = Number.POSITIVE_INFINITY
  for (const ratio of ASPECT_RATIOS) {
    const distance = Math.abs(Math.log(ASPECT_RATIO_VALUE[ratio] / target))
    if (distance < bestDistance) {
      best = ratio
      bestDistance = distance
    }
  }
  return best
}
