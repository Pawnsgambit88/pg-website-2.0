import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { PreviewBanner } from '@/components/layout/PreviewBanner'
import { PublicNav } from '@/components/layout/PublicNav'
import { SkipLink } from '@/components/layout/SkipLink'
import { getSiteSection } from '@/lib/data/public/site-section'
import { WebVitals } from '@/lib/observe/WebVitals'
import { INDEX_METADATA } from '@/lib/routes/metadata'

// Public group: static shell, indexable (overrides the root noindex default). No request APIs here or below
// (ARCH-001 7.3), so every page stays prerenderable. The one exception is `draftMode()` (PreviewBanner and the preview
// fetchers): it does not opt a route out of prerendering, it only reads the draft flag when a bypass cookie is present. The header and footer read the `nav` and `footer` site sections
// (tagged, ISR 900 s, React.cache); a failed read throws to the error boundary (ARCH-001 7.6), it is never replaced
// by empty chrome. Missing optional fields fall back to static links inside PublicNav and Footer.
export const metadata: Metadata = INDEX_METADATA

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Independent reads start together (RBP async-parallel).
  const [nav, footer] = await Promise.all([getSiteSection('nav'), getSiteSection('footer')])

  return (
    <>
      <SkipLink />
      <PreviewBanner />
      <PublicNav items={nav.content.primary} />
      <MainLandmark>{children}</MainLandmark>
      <Footer
        tagline={footer.content.tagline}
        links={footer.content.links}
        social={footer.content.social}
        legalNote={footer.content.legalNote}
      />
      <WebVitals />
    </>
  )
}
