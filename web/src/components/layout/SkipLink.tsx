import { MAIN_ID } from '@/lib/routes/landmarks'

/**
 * First focusable element of every page (ARCH-001 15, WCAG 2.4.1). Hidden until focused, then pinned top-left above
 * sticky bars. Targets `<main id="main" tabIndex={-1}>` rendered by `MainLandmark`; the browser moves focus there
 * on activation, so no script is needed and it works before hydration.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      className="sr-only bg-forest type-button text-parchment focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:inline-flex focus:min-h-tap focus:items-center focus:px-4"
    >
      Skip to main content
    </a>
  )
}
