import { Button } from '@/components/ui/Button'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { ACTION_LABEL } from './eventDecision'
import { registerPath } from './eventText'

interface MobileActionBarProps {
  slug: string
  title: string
  priceText: string
  action: 'register' | 'waitlist'
}

/**
 * Sticky bottom action on phones (below 960px only; the decision panel is sticky from 960px). Server Component, no JS:
 * it is `position: sticky` at the bottom of the page flow, so it never covers the footer or any content after it and
 * needs no measured spacer; safe-area padding keeps it above the home indicator. It is a labelled `<div>`, not a
 * landmark, and repeats only the price and the action link (the panel above carries the explanation), so screen
 * readers do not hear the availability twice.
 */
export function MobileActionBar({ slug, title, priceText, action }: MobileActionBarProps) {
  return (
    <div className="sticky bottom-0 z-header border-t border-line bg-parchment-soft px-safe pb-safe-3 md:hidden">
      <div className="shell flex items-center justify-between gap-4 pt-3">
        <p className="min-w-0 wrap-break-word">
          <span className="sr-only">{title}, </span>
          <strong className="font-display text-2xl leading-none font-medium">{priceText}</strong>
        </p>
        <Button
          href={registerPath(slug)}
          variant={action === 'register' ? 'copper' : 'secondary'}
          size="lg"
          icon={<ArrowRight size="sm" />}
          iconPosition="end"
          className="shrink-0"
        >
          {ACTION_LABEL[action]}
        </Button>
      </div>
    </div>
  )
}
