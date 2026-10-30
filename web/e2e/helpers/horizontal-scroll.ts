import { expect, type Page } from '@playwright/test'

export type ScrollReport = {
  viewportWidth: number
  documentScrollWidth: number
  bodyScrollWidth: number
  /** Elements whose right edge passes the viewport, widest overshoot first (diagnostics only). */
  overflowing: { element: string; right: number }[]
}

export async function measureHorizontalScroll(page: Page): Promise<ScrollReport> {
  return page.evaluate(() => {
    const root = document.documentElement
    const viewportWidth = root.clientWidth
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : ''
      const cls =
        typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : ''
      return `${el.tagName.toLowerCase()}${id}${cls}`
    }
    const overflowing: { element: string; right: number }[] = []
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.right > viewportWidth + 0.5) {
        overflowing.push({ element: describe(el), right: Math.round(rect.right) })
      }
    }
    overflowing.sort((a, b) => b.right - a.right)
    return {
      viewportWidth,
      documentScrollWidth: root.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      overflowing: overflowing.slice(0, 10),
    }
  })
}

/**
 * The page must not scroll horizontally: `scrollWidth <= clientWidth` on both <html> and <body> (ARCH-001 16.2).
 * Call it after the page has settled and again after opening menus, dialogs and long-name fixtures.
 * Zero tolerance: a 1px overflow is still a scrollbar on touch devices.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const report = await measureHorizontalScroll(page)
  const detail = report.overflowing.map((o) => `${o.element} (right edge ${o.right}px)`).join('; ') || 'none found'
  expect(
    report.documentScrollWidth,
    `<html> scrolls horizontally: scrollWidth ${report.documentScrollWidth} > clientWidth ${report.viewportWidth}. Widest elements: ${detail}`,
  ).toBeLessThanOrEqual(report.viewportWidth)
  expect(
    report.bodyScrollWidth,
    `<body> scrolls horizontally: scrollWidth ${report.bodyScrollWidth} > clientWidth ${report.viewportWidth}. Widest elements: ${detail}`,
  ).toBeLessThanOrEqual(report.viewportWidth)
}
