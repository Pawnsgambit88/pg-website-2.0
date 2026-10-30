import type { LegalPage, LegalPageDto } from '@/lib/api/types/legal-sitemap'
import { deepFreeze } from '@/lib/mock/seeds/freeze'

// Representative placeholder legal text. NOT legal advice and not the production policy.

const page = (pageId: LegalPage, title: string, text: string): LegalPageDto => ({
  page: pageId,
  title,
  effectiveDate: '2026-10-01',
  version: 1,
  blocks: [
    { type: 'paragraph', text },
    { type: 'heading', level: 2, text: 'Questions' },
    { type: 'paragraph', text: 'Write to the event desk and we will answer within two working days.' },
  ],
})

export const MOCK_LEGAL: Readonly<Record<LegalPage, LegalPageDto>> = deepFreeze({
  privacy: page('privacy', 'Privacy policy', 'Sample text: we collect only what is needed to run events.'),
  terms: page('terms', 'Terms of use', 'Sample text: play fair, be kind, and respect the venue.'),
  'refund-policy': page('refund-policy', 'Refund policy', 'Sample text: cancel before the window closes for a refund.'),
})
