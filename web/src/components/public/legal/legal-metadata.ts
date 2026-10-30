import type { Metadata } from 'next'
import { isLegalWordingApproved } from '@/components/public/legal/legal-approval'
import { legalDescription } from '@/components/public/legal/legal-outline'
import type { LegalPageDto } from '@/lib/api/types/legal-sitemap'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * Metadata for a legal page: DTO title, first paragraph as the description, canonical `/{page}`. Served `noindex`
 * while the wording is unapproved (legal-approval.ts), so a draft policy never enters the search index.
 */
export function legalMetadata(page: LegalPageDto): Metadata {
  return buildMetadata({
    title: page.title,
    description: legalDescription(page.blocks),
    path: `/${page.page}`,
    noindex: !isLegalWordingApproved(page.page),
  })
}
