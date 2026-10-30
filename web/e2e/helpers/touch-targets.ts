import { expect, type Page } from '@playwright/test'

export type TouchTargetOptions = {
  /** Minimum width and height in CSS px. 44 by default (ARCH-001 16.2). */
  min?: number
  /** Limit the check to this subtree. Default: the whole document. */
  scope?: string
  /** Stricter minimum for specific controls, e.g. `{ 'input, select, textarea': 48 }` (the 48px controls in the spec). */
  overrides?: Record<string, number>
  /** Extra selectors that are exempt from the check (each exemption should be justified at the call site). */
  exempt?: string[]
}

export type TouchTargetViolation = { element: string; width: number; height: number; required: number }

const INTERACTIVE = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export async function findTouchTargetViolations(
  page: Page,
  options: TouchTargetOptions = {},
): Promise<{ checked: number; violations: TouchTargetViolation[] }> {
  const { min = 44, scope, overrides = {}, exempt = [] } = options
  return page.evaluate(
    ({ interactive, min, scope, overrides, exempt }) => {
      const root: ParentNode = scope ? (document.querySelector(scope) ?? document) : document
      const violations: { element: string; width: number; height: number; required: number }[] = []
      let checked = 0

      const describe = (el: Element) => {
        const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
        const type = el.getAttribute('type')
        return `${el.tagName.toLowerCase()}${type ? `[type=${type}]` : ''}${label ? ` "${label}"` : ''}`
      }

      // Inline link inside running text: exempt (WCAG 2.5.8 inline exception). A link that is alone in its block
      // (nav item, card link, standalone text link) is not inline text and is checked.
      const isInlineTextLink = (el: Element) => {
        if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false
        const parent = el.parentElement
        if (!parent) return false
        return Array.from(parent.childNodes).some(
          (node) => node !== el && node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
        )
      }

      for (const el of root.querySelectorAll(interactive)) {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') continue
        if (el.closest('[hidden], [inert]')) continue
        if (exempt.some((selector) => el.matches(selector))) continue
        if (isInlineTextLink(el)) continue

        // A radio or checkbox that is visually hidden is operated through its <label>; the label is what gets measured.
        let target: Element = el
        if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
          const label = el.labels?.[0]
          if (label && el.getBoundingClientRect().width <= 1) target = label
        }
        const rect = target.getBoundingClientRect()
        // Visually-hidden pattern (1px clipped, e.g. a skip link before focus) is not a tap target.
        if (rect.width <= 1 && rect.height <= 1) continue

        let required = min
        for (const [selector, value] of Object.entries(overrides)) {
          if (el.matches(selector)) required = Math.max(required, value)
        }
        checked += 1
        if (rect.width + 0.5 < required || rect.height + 0.5 < required) {
          violations.push({
            element: describe(el),
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            required,
          })
        }
      }
      return { checked, violations }
    },
    { interactive: INTERACTIVE, min, scope, overrides, exempt },
  )
}

/**
 * Every visible, enabled interactive element is at least `min` x `min` CSS px (ARCH-001 16.2). Inline links in running
 * text are exempt. Returns how many elements were checked so a caller can assert the check was not vacuous.
 */
export async function expectTouchTargets(page: Page, options: TouchTargetOptions = {}): Promise<{ checked: number }> {
  const { checked, violations } = await findTouchTargetViolations(page, options)
  const detail = violations.map((v) => `${v.element} is ${v.width}x${v.height}, needs ${v.required}`).join('\n  ')
  expect(violations, `Touch targets below the minimum:\n  ${detail}`).toEqual([])
  return { checked }
}
