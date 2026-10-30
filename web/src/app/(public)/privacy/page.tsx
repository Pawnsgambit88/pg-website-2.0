import type { Metadata } from 'next'
import { isLegalWordingApproved } from '@/components/public/legal/legal-approval'
import { legalMetadata } from '@/components/public/legal/legal-metadata'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { getLegalPage } from '@/lib/data/public/legal-page'

// Privacy legal page (screen 09). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3) and the
// `legal:privacy` tag revalidates on publish. No request APIs. getLegalPage is React.cache'd, so metadata and page share
// one read; a failure throws to the (public) error boundary.
export const revalidate = 900

const PAGE = 'privacy'

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(await getLegalPage(PAGE))
}

export default async function PrivacyPage() {
  const page = await getLegalPage(PAGE)
  return <LegalPage page={page} approved={isLegalWordingApproved(PAGE)} />
}
