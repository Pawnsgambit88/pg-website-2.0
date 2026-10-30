import { Anek_Latin, Fragment_Mono, Newsreader } from 'next/font/google'

/**
 * Self-hosted brand typefaces (TASK-011, ARCH-001 13.2). next/font/google downloads the files at build time and serves
 * them from /_next/static/media on our own origin: no runtime request to fonts.googleapis.com or fonts.gstatic.com.
 *
 * The exported `variable` names are the contract with src/styles/theme.css (TASK-010): the --font-display, --font-ui and
 * --font-mono theme tokens resolve from these. Never name these variables --font-display/--font-ui/--font-mono (cycle).
 *
 * Decisions (evidence in the TASK-011 report):
 *  - Newsreader: variable wght, roman only, NO opsz axis. With axes: ['opsz'] the latin file is 131.8 KB and the two
 *    preloaded files reach 176.7 KB, over the 150 KB Home budget. Without it the latin file is 58.2 KB (opsz pinned at the
 *    font default of 16) and the preload total is 103 KB. Cost: no optical sizing on large headlines (slightly lower
 *    contrast than the reference at hero sizes). Lever to restore it: local files trimmed with fonttools instancer
 *    (wght 300-600, opsz 16-72 is still 112.8 KB, so it needs a designer budget decision; asset-inventory D3).
 *  - No Newsreader italic: the reference requested no ital axis, so its italics were faux oblique (asset-inventory D3).
 *  - Anek Latin: variable wght, no wdth axis (width axis is unused anywhere in the design).
 *  - Fragment Mono: weight 400 only, no italic. No 600 face exists; status badges use 400 (asset-inventory D4).
 *  - Subsets: `subsets: ['latin']` is the PRELOAD list. Google's CSS still declares every unicode-range face (latin-ext,
 *    vietnamese, ...) and next/font self-hosts all of them, but browsers download a non-preloaded face only when a
 *    character in its range is rendered. The rupee sign U+20B9 is in latin-ext only (verified in all three families,
 *    absent from latin), so it costs one extra on-demand request on price text and is never preloaded. Listing
 *    'latin-ext' here would preload it (+36 KB Anek, +87 KB Newsreader) and break the budget.
 *  - Fallbacks: adjustFontFallback generates size-adjusted local faces (Times New Roman, Arial, Arial).
 */

export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: 'normal',
  display: 'swap',
  variable: '--font-newsreader',
  adjustFontFallback: true,
  preload: true,
})

export const anekLatin = Anek_Latin({
  subsets: ['latin'],
  weight: 'variable',
  style: 'normal',
  display: 'swap',
  variable: '--font-anek-latin',
  adjustFontFallback: true,
  preload: true,
})

export const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-fragment-mono',
  adjustFontFallback: true,
  // Mono text (eyebrows, dates, badges) is mostly small and below the largest paint; not preloaded to protect the
  // 150 KB Home font budget. It still loads early because the stylesheet references it. Revisit if the swap flash shows.
  preload: false,
})

/** Class string for <html>: defines --font-newsreader, --font-anek-latin and --font-fragment-mono. */
export const fontVariables = [newsreader.variable, anekLatin.variable, fragmentMono.variable].join(' ')
