import type { Page } from '@playwright/test'

/** `prefers-reduced-motion: reduce` for the page (ARCH-001 16.2 `withReducedMotion`). */
export async function withReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
}
