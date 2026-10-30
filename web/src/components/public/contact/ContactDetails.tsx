import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { classifyHref, type LinkHref } from '@/components/ui/linkHref'

interface ContactDetailsProps {
  supportEmail: string
  /** WhatsApp or phone link from settings; null when not configured. */
  deskContactHref: string | null
  /** `form`: the side panel next to the form. `off`: the form is disabled, so this is the only way to reach PG. */
  mode: 'form' | 'off'
}

const TITLE_ID = 'contact-details-title'

/**
 * Direct contact options (reference `aside.surface--forest`, F-CON-002): WhatsApp for event-day questions, email for
 * the rest, both from public settings. Links from data pass the link policy (http(s), mailto, tel only); an unsafe or
 * missing WhatsApp link is simply left out. With the form off (NEXT_PUBLIC_CONTACT_MODE=off) the copy says so and
 * this panel is the contact surface. Server Component.
 */
export function ContactDetails({ supportEmail, deskContactHref, mode }: ContactDetailsProps) {
  // Settings links are absolute (schema: safe http(s), mailto, tel), so the typed-routes cast is sound; the policy
  // check below still rejects anything that is not external.
  const desk =
    deskContactHref !== null && classifyHref(deskContactHref as LinkHref) === 'external' ? deskContactHref : null
  const deskIsWhatsApp = desk !== null && /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(desk)

  return (
    <Surface as="aside" tone="forest" padding="lg" aria-labelledby={TITLE_ID} className="flex flex-col gap-4">
      <Eyebrow>{mode === 'off' ? 'Reach us directly' : 'Quicker?'}</Eyebrow>
      <Heading level={2} size="panel" id={TITLE_ID}>
        {mode === 'off'
          ? 'Message or email us and a person will reply.'
          : 'For event-day questions, WhatsApp is usually faster.'}
      </Heading>
      <Text tone="on-dark">For partnerships, press and venue collaborations, email keeps the context together.</Text>
      <InfoStack className="mt-2 border-line-light">
        {desk === null ? null : (
          <InfoRow label={deskIsWhatsApp ? 'WhatsApp' : 'Event desk'}>
            <TextLink href={desk as LinkHref} newTab={deskIsWhatsApp}>
              {deskIsWhatsApp ? 'Message the event desk' : 'Contact the event desk'}
            </TextLink>
          </InfoRow>
        )}
        <InfoRow label="Email">
          <TextLink href={`mailto:${supportEmail}` as LinkHref}>
            <span className="break-all">{supportEmail}</span>
          </TextLink>
        </InfoRow>
      </InfoStack>
    </Surface>
  )
}
