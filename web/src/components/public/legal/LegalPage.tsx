import { Section } from '@/components/layout/Section'
import { LegalBlock } from '@/components/public/legal/LegalBlock'
import { headingIds, tocEntries } from '@/components/public/legal/legal-outline'
import { LegalToc } from '@/components/public/legal/LegalToc'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { Banner } from '@/components/ui/feedback/Banner'
import type { LegalPageDto } from '@/lib/api/types/legal-sitemap'
import { formatEventDate } from '@/lib/format/date'

interface LegalPageProps {
  /** Legal page from getLegalPage (contract P09). */
  page: LegalPageDto
  /**
   * Owner approval of the wording (legal-approval.ts, FEAT-001 OQ-04). `false` shows the "being finalised" notice
   * above the text.
   */
  approved: boolean
}

const TITLE_ID = 'legal-title'

/** `effectiveDate` is a calendar date (`2026-10-01`); anchored to IST midnight so the shown day never shifts. */
function effectiveDateText(isoDate: string): string {
  return formatEventDate(`${isoDate}T00:00:00+05:30`, { weekday: 'none' })
}

/**
 * Shared template for Privacy, Terms and Refund policy (screens 09 to 11, reference `.legal-static` / `.legal-copy`):
 * eyebrow, h1 title, effective date, the approval notice while the wording is unapproved, a table of contents built
 * from the level-2 headings, and the closed-model blocks in a readable measure. An empty page shows a notice rather
 * than a blank page (AC-27). Everything is in the server HTML; no client JS. Server Component.
 */
export function LegalPage({ page, approved }: LegalPageProps) {
  const ids = headingIds(page.blocks)
  const toc = tocEntries(page.blocks, ids)

  return (
    <Section aria-labelledby={TITLE_ID} space="flush" className="sm:pt-16">
      <header className="max-w-3xl border-b border-line pb-8">
        <Eyebrow>Legal</Eyebrow>
        <Heading level={1} size="page-intro" id={TITLE_ID} className="mt-2 max-w-3xl">
          {page.title}
        </Heading>
        <p className="mt-4 font-mono text-label text-muted">
          Effective date: <time dateTime={page.effectiveDate}>{effectiveDateText(page.effectiveDate)}</time>
          <span aria-hidden="true"> · </span>
          <span>Version {page.version}</span>
        </p>
      </header>

      {approved ? null : (
        <Banner tone="warning" title="This page is being finalised." className="mt-8 max-w-3xl">
          The wording below is a draft and is not yet the approved policy. If you have a question before it is final,{' '}
          <TextLink href="/contact" inline>
            contact us
          </TextLink>
          .
        </Banner>
      )}

      <div className="mt-10 flex flex-col gap-10 md:flex-row md:gap-16">
        {toc.length === 0 ? null : (
          <div className="md:w-sidebar md:shrink-0">
            <LegalToc entries={toc} />
          </div>
        )}
        <article aria-labelledby={TITLE_ID} className="min-w-0 max-w-3xl flex-1">
          {page.blocks.length === 0 ? (
            <Text tone="inherit" className="max-w-prose text-ink-soft">
              The full text of this page is not available yet. If you need it now,{' '}
              <TextLink href="/contact" inline>
                contact us
              </TextLink>{' '}
              and we will send it to you.
            </Text>
          ) : (
            page.blocks.map((block, index) => (
              // Blocks have no id; the list is fixed per published version, so the position is a stable key.
              <LegalBlock key={`${block.type}-${index}`} block={block} id={ids[index]} />
            ))
          )}
        </article>
      </div>
    </Section>
  )
}
