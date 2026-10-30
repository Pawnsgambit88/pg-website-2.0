import type { Route } from 'next'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { TextLink } from '@/components/ui/TextLink'
import type { PanelScreen } from '@/features/registration/resolve-screen'
import { formatEventDateTime } from '@/lib/format/date'
import type { ProfileField } from '@/lib/api/types/profile'
import { eventPageHref, registerPageHref } from '@/features/registration/links'
import { loginPath } from '@/lib/security/safe-redirect'

// Ineligible and shell screens (screens 18 to 21, FE-05). Each one says what is true, why, and the one next step.
// The copy never promises a refund, a price or a place the backend did not state.

const FIELD_LABEL: Record<ProfileField, string> = {
  name: 'name',
  city: 'city',
  area: 'area',
  phone: 'phone number',
  birthday: 'date of birth',
  chessComHandle: 'Chess.com username',
  fideId: 'FIDE ID',
}

function listFields(fields: readonly ProfileField[]): string {
  const labels = fields.map((field) => FIELD_LABEL[field])
  if (labels.length <= 1) return labels[0] ?? 'details'
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1) ?? ''}`
}

interface ScreenPanelProps {
  screen: PanelScreen
  slug: string
}

/** Where a player goes when this screen is a dead end for registering. */
function eventLink(slug: string) {
  return (
    <TextLink href={eventPageHref(slug)} inline>
      Back to the event page
    </TextLink>
  )
}

export function ScreenPanel({ screen, slug }: ScreenPanelProps) {
  switch (screen.kind) {
    case 'sign_in':
      return (
        <EmptyState
          headingLevel={2}
          title="Sign in to register"
          action={
            <Button href={loginPath(registerPageHref(slug)) as Route} fullWidth>
              Sign in
            </Button>
          }
        >
          Registration is tied to your player account, so we can hold your place and send your confirmation. You will
          come straight back here after signing in.
        </EmptyState>
      )
    case 'event_cancelled':
      return (
        <EmptyState
          headingLevel={2}
          title="This event has been cancelled"
          action={
            <Button href="/play" variant="secondary" fullWidth>
              See other events
            </Button>
          }
        >
          {screen.reason === null
            ? 'Registration is no longer possible.'
            : `${screen.reason} Registration is no longer possible.`}
        </EmptyState>
      )
    case 'closed':
      return (
        <EmptyState
          headingLevel={2}
          title={screen.ended ? 'This event has already started' : 'Registration is closed'}
          action={
            <Button href="/play" variant="secondary" fullWidth>
              See other events
            </Button>
          }
        >
          {screen.ended
            ? 'Places can no longer be booked online. Browse the next events to find another one.'
            : 'Registration for this event has closed. Browse the other events to find one that is still open.'}{' '}
          {eventLink(slug)}
        </EmptyState>
      )
    case 'not_yet_open':
      return (
        <EmptyState headingLevel={2} title="Registration has not opened yet">
          Registration opens on {formatEventDateTime(screen.opensAt)}. Come back then to take your place.{' '}
          {eventLink(slug)}
        </EmptyState>
      )
    case 'profile_incomplete':
      return (
        <EmptyState
          headingLevel={2}
          title="Finish your profile to register"
          action={
            <Button href="/app/profile" fullWidth>
              Complete your profile
            </Button>
          }
        >
          {screen.fields.length === 0
            ? 'Hosts need a few details before you can take a place.'
            : `Hosts need your ${listFields(screen.fields)} before you can take a place.`}{' '}
          Your details stay private unless you choose to share them. Once saved, return to this page to register.
        </EmptyState>
      )
    case 'not_eligible':
      return (
        <EmptyState
          headingLevel={2}
          title="This event is not open to your account"
          action={
            <Button href="/contact" variant="secondary" fullWidth>
              Contact the desk
            </Button>
          }
        >
          {screen.reason === 'age_restricted'
            ? 'This event has an age requirement that your profile does not meet.'
            : 'This event is restricted to a particular group of players.'}{' '}
          If you think this is a mistake, the desk can help. {eventLink(slug)}
        </EmptyState>
      )
    case 'sold_out':
      return (
        <EmptyState
          headingLevel={2}
          title="This event is full"
          action={
            <Button href="/play" variant="secondary" fullWidth>
              See other events
            </Button>
          }
        >
          Every place is taken and there is no waitlist for this event. {eventLink(slug)}
        </EmptyState>
      )
    case 'inactive_registration':
      return (
        <EmptyState
          headingLevel={2}
          title={
            screen.registration.status === 'refunded'
              ? 'Your registration was refunded'
              : 'Your registration was cancelled'
          }
          action={
            <Button href="/app/events" variant="secondary" fullWidth>
              My events
            </Button>
          }
        >
          This registration no longer holds a place. {eventLink(slug)}
        </EmptyState>
      )
  }
}
