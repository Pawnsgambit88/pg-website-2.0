import Link from 'next/link'
import { cn } from '@/lib/cn'

interface BrandMarkProps {
  /** `light` on parchment (forest roundel), `dark` on forest surfaces (parchment roundel, forest letters). */
  tone?: 'light' | 'dark'
  /**
   * Hide the wordmark below 480px (it stays in the accessible name). The header uses this so the 320px bar fits the
   * roundel, the primary action and the menu trigger on one line.
   */
  compact?: boolean
}

/**
 * The PG brand (ASSET-INVENTORY 4): a CSS roundel with "PG" plus the live-text wordmark "PAWN'S GAMBIT", linking home.
 * No logo file: the legacy logo is a different identity. Roundel and wordmark are decorative (`aria-hidden`); the link
 * name is "Pawn's Gambit, home" at every width, including when `compact` hides the wordmark. Server Component.
 */
export function BrandMark({ tone = 'light', compact = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      // Contains the visible wordmark, so the spoken name matches what sighted users see (WCAG 2.5.3).
      aria-label="Pawn's Gambit, home"
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-3 rounded-public',
        tone === 'dark' ? 'text-parchment' : 'text-ink',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full font-display text-lg leading-none tracking-tighter',
          tone === 'dark' ? 'bg-parchment text-forest' : 'bg-forest text-parchment',
        )}
      >
        PG
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'font-display text-lg leading-none font-semibold tracking-tight whitespace-nowrap',
          compact && 'hidden xs:inline',
        )}
      >
        PAWN&apos;S GAMBIT
      </span>
    </Link>
  )
}
