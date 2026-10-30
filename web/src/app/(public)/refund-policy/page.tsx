import type { Metadata } from 'next'
import { isLegalWordingApproved } from '@/components/public/legal/legal-approval'
import { legalMetadata } from '@/components/public/legal/legal-metadata'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { getLegalPage } from '@/lib/data/public/legal-page'

// Refund policy legal page (screen 11). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3) and the
// `legal:refund-policy` tag revalidates on publish. No request APIs. getLegalPage is React.cache'd, so metadata and page share
// one read; a failure throws to the (public) error boundary.
export const revalidate = 900

const PAGE = 'refund-policy'

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(await getLegalPage(PAGE))
}

export default async function RefundPolicyPage() {
  const page = await getLegalPage(PAGE)
  return <LegalPage page={page} approved={isLegalWordingApproved(PAGE)} />
}
