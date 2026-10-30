import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// axe-core is a dependency of @axe-core/playwright, not of this package, so its types are derived rather than imported.
type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>
type Result = AxeResults['violations'][number]

export type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical'

const ORDER: readonly AxeImpact[] = ['minor', 'moderate', 'serious', 'critical']

export type AxeOptions = {
  /** Smallest impact that fails the test. Default 'serious' (so serious and critical fail), per AC-86. */
  minImpact?: AxeImpact
  /** Restrict the scan to these selectors. */
  include?: string[]
  /** Skip these selectors (third-party widgets only; justify at the call site). */
  exclude?: string[]
}

// WCAG 2.2 AA is the product target (ARCH-001 15).
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

export function atOrAbove(impact: Result['impact'], min: AxeImpact): boolean {
  return impact != null && ORDER.indexOf(impact) >= ORDER.indexOf(min)
}

export async function runAxe(page: Page, options: AxeOptions = {}): Promise<AxeResults> {
  let builder = new AxeBuilder({ page }).withTags(TAGS)
  for (const selector of options.include ?? []) builder = builder.include(selector)
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector)
  return builder.analyze()
}

/**
 * Fails when axe finds a violation at or above `minImpact` (default 'serious').
 * Returns the number of rules that passed so callers can see that the scan really ran.
 */
export async function expectNoAxeViolations(page: Page, options: AxeOptions = {}): Promise<{ rulesPassed: number }> {
  const { minImpact = 'serious' } = options
  const results = await runAxe(page, options)
  const failing = results.violations.filter((v) => atOrAbove(v.impact, minImpact))
  const summary = failing
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} node(s), first: ${v.nodes[0]?.target.join(' ') ?? '?'})`,
    )
    .join('\n  ')
  expect(failing, `axe violations at ${minImpact} or above on ${page.url()}:\n  ${summary}`).toEqual([])
  return { rulesPassed: results.passes.length }
}
