import { configureAxe } from 'vitest-axe'

// Thin wrapper over vitest-axe (pre-1.0, ARCH-001 5.1). Tests call only `expectNoAxeViolations`,
// so vitest-axe can be swapped for raw axe-core without touching any test.
// jsdom cannot compute layout or colour, so `color-contrast` is disabled here (Playwright axe covers it at real
// viewports, TASK-009) and `region` is disabled because component tests render fragments, not full pages.

type Impact = 'minor' | 'moderate' | 'serious' | 'critical'

const IMPACT_ORDER: readonly Impact[] = ['minor', 'moderate', 'serious', 'critical']

const runAxe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

export interface AxeOptions {
  /** Lowest impact that fails the test. DoD-S: no serious axe violations, so the default is `serious`. */
  minImpact?: Impact
}

export async function expectNoAxeViolations(container: Element, options: AxeOptions = {}): Promise<void> {
  const { minImpact = 'serious' } = options
  const threshold = IMPACT_ORDER.indexOf(minImpact)
  const results = await runAxe(container)
  const failing = results.violations.filter((violation) => {
    const impact = violation.impact
    return impact !== undefined && impact !== null && IMPACT_ORDER.indexOf(impact) >= threshold
  })
  if (failing.length > 0) {
    const report = failing
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ')
        return `- ${violation.id} (${violation.impact}): ${violation.help} [${targets}]`
      })
      .join('\n')
    throw new Error(`Expected no axe violations at "${minImpact}" or above, found ${failing.length}:\n${report}`)
  }
}
