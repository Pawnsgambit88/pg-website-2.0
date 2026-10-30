import type { LegalTocEntry } from '@/components/public/legal/legal-outline'

interface LegalTocProps {
  entries: readonly LegalTocEntry[]
}

const TOC_LABEL_ID = 'legal-toc-label'

/**
 * "On this page" list (reference `.legal-static aside`: mono, small, muted, `01 · Overview`). Above the text below
 * 960px, a sticky left column from `md` (top clears the 72px header). Plain in-page anchors (no router needed); each
 * row is at least 44px tall. Muted on parchment is 4.85:1, the hover underline is a second cue. Server Component.
 */
export function LegalToc({ entries }: LegalTocProps) {
  if (entries.length === 0) return null
  return (
    <nav aria-labelledby={TOC_LABEL_ID} className="md:sticky md:top-24 md:self-start">
      <p id={TOC_LABEL_ID} className="type-eyebrow text-copper-dark">
        On this page
      </p>
      <ol className="mt-2 flex flex-col border-t border-line">
        {entries.map((entry, index) => (
          <li key={entry.id} className="border-b border-line">
            <a
              href={`#${entry.id}`}
              className="flex min-h-tap items-center gap-2 py-2 font-mono text-label wrap-break-word text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')} ·</span>
              <span className="min-w-0">{entry.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
