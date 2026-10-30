import type { Metadata } from 'next'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { NotFoundView } from '@/components/layout/NotFoundView'
import { SkipLink } from '@/components/layout/SkipLink'

// Global 404 (FEAT-001 screen 12): unknown paths, invalid or unknown slugs, and notFound() from the (handoff) layout.
// It renders inside the root layout, outside any group layout, so it supplies its own skip link and <main>.
// Next adds `noindex` and answers 404 before streaming starts.
export const metadata: Metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <MainLandmark>
        <NotFoundView />
      </MainLandmark>
    </>
  )
}
