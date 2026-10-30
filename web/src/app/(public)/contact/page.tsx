import type { Metadata } from 'next'
import { Section } from '@/components/layout/Section'
import { ContactDetails } from '@/components/public/contact/ContactDetails'
import { ContactForm } from '@/components/public/contact/ContactForm'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { getPublicSettings } from '@/lib/data/public/public-settings'
import { envPublic } from '@/lib/env/env.public'
import { buildMetadata } from '@/lib/seo/metadata'

// Contact (screen 08, TASK-048). Static, prerendered; 900 s matches the public ISR window (ARCH-001 7.3). The only
// read is the public settings (WhatsApp / email for the side panel, tagged `site:meta`); a failed read throws to the
// (public) error boundary so ISR keeps the last good page. No request APIs. The form is the page's only client island.
// NEXT_PUBLIC_CONTACT_MODE is a build-time flag (ARCH-001 21): `off` renders the direct options instead of the form.
export const revalidate = 900

const PATH = '/contact'
const TITLE_ID = 'contact-title'
const FORM_TITLE_ID = 'contact-form-title'
const LEAD = 'Questions about an event, partnership or your first visit. Send the useful version.'

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: `${LEAD} A person from Pawn's Gambit replies.`,
  path: PATH,
})

export default async function ContactPage() {
  const settings = await getPublicSettings()
  const mode = envPublic.CONTACT_MODE

  return (
    <>
      <section aria-labelledby={TITLE_ID} className="border-b border-line pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="shell flex flex-col gap-3">
          <Eyebrow>Contact</Eyebrow>
          <Heading level={1} size="hero" id={TITLE_ID} className="max-w-xl">
            Need a human?
          </Heading>
          <Text variant="lead">{LEAD}</Text>
        </div>
      </section>

      <Section space="compact" as="div">
        {mode === 'form' ? (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12">
            <Surface as="section" padding="lg" aria-labelledby={FORM_TITLE_ID} className="md:col-span-8">
              <Heading level={2} size="card" id={FORM_TITLE_ID} className="mb-5">
                Send us a message
              </Heading>
              <ContactForm />
            </Surface>
            <div className="min-w-0 md:col-span-4">
              <ContactDetails
                supportEmail={settings.supportEmail}
                deskContactHref={settings.deskContactHref}
                mode="form"
              />
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <ContactDetails
              supportEmail={settings.supportEmail}
              deskContactHref={settings.deskContactHref}
              mode="off"
            />
          </div>
        )}
      </Section>
    </>
  )
}
