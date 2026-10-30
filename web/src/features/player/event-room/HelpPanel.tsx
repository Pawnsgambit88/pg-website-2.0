import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { classifyHref } from '@/components/ui/linkHref'
import type { LinkHref } from '@/components/ui/linkHref'

interface HelpPanelProps {
  /**
   * WhatsApp, tel or mailto href from `PublicSettingsDto.deskContactHref` (P12). Falls back to `/contact` when
   * null or omitted. Must be an offline-safe plain link: no fetch, no auth (EV-06 AC).
   */
  contactHref?: string | null
}

/**
 * "NEED HELP?" panel with the "Message event desk" action (EV-06, reference screens 24–29).
 * The contactHref is a plain <a> link — works offline and without JavaScript.
 */
export function HelpPanel({ contactHref }: HelpPanelProps = {}) {
  // Use the configured desk href if it is a valid safe href; otherwise fall back to the contact page.
  const configured = typeof contactHref === 'string' && contactHref.length > 0 ? contactHref : null
  const isExternal = configured !== null && classifyHref(configured as LinkHref) === 'external'
  const href: LinkHref = configured !== null ? (configured as LinkHref) : '/contact'

  return (
    <Surface as="aside" aria-labelledby="room-help-heading">
      <Eyebrow>NEED HELP?</Eyebrow>
      <Heading level={2} size="card" id="room-help-heading" className="mt-1">
        A host is never far.
      </Heading>
      <Text className="mt-2">
        If the pairing looks wrong, someone is missing or you&rsquo;re unsure what to do, don&rsquo;t troubleshoot the
        event yourself.
      </Text>
      <div className="mt-4">
        <Button variant="secondary" href={href} newTab={isExternal && /^https?:\/\//.test(configured ?? '')}>
          Message event desk
        </Button>
      </div>
    </Surface>
  )
}
