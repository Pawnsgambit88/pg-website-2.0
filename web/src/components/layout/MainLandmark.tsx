import type { ReactNode } from 'react'
import { MAIN_ID } from '@/lib/routes/landmarks'

/**
 * The single `<main>` of a page: skip-link target and route-change focus target. `tabIndex={-1}` makes it focusable by
 * script and by the skip link without adding a tab stop; the outline is dropped because it is not an interactive control.
 */
export function MainLandmark({ children }: { children: ReactNode }) {
  return (
    <main id={MAIN_ID} tabIndex={-1} className="outline-none">
      {children}
    </main>
  )
}
