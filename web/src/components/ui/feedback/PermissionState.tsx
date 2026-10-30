import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import type { HeadingLevel } from '@/components/ui/headingLevel'
import type { LinkHref } from '@/components/ui/linkHref'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { safeReturnTo } from '@/components/ui/feedback/safeReturnTo'

/**
 * Why the content is withheld.
 *  signed-out     no session: offer log in, with the current page as the return-to intent
 *  forbidden      signed in but not allowed (HTTP 403): offer the player home, no retry
 *  role-required  needs a role the account lacks (admin area): says which role, offers the player home
 */
export type PermissionVariant = 'signed-out' | 'forbidden' | 'role-required'

interface PermissionStateProps {
  variant: PermissionVariant
  /** Role name for `role-required` ("admin"). Developer-written. */
  role?: string
  /** Where to send the player back after logging in (the current path + query). Unsafe values are dropped. */
  returnTo?: string
  /** What the player was trying to open ("this event room"). Fills the body copy. */
  subject?: string
  headingLevel?: HeadingLevel
  /** Extra controls after the primary action. */
  children?: ReactNode
  className?: string
}

/** Log in link carrying the safe return-to intent, or plain `/login` when there is none. */
function loginHref(returnTo: string | undefined): LinkHref {
  const safe = safeReturnTo(returnTo)
  return safe === undefined ? '/login' : { pathname: '/login', query: { returnTo: safe } }
}

/**
 * Shown by guards and by 401/403 results in place of protected content (ARCH-001 11.7, DoD-S). Each variant names what
 * is wrong and gives the right next action. Never rendered while the session is still loading (guards show a skeleton
 * first). Not `role="alert"`: it is the page content, reached by navigation. Server Component.
 */
export function PermissionState({
  variant,
  role = 'admin',
  returnTo,
  subject = 'this page',
  headingLevel = 2,
  children,
  className,
}: PermissionStateProps) {
  const title =
    variant === 'signed-out'
      ? 'Please log in to continue'
      : variant === 'role-required'
        ? `This area is for PG ${role}s only`
        : "You don't have access to this"
  const body =
    variant === 'signed-out'
      ? `Log in to open ${subject}. We'll bring you back here afterwards.`
      : variant === 'role-required'
        ? `Your account does not have ${role} access. If you think it should, ask a PG admin.`
        : `Your account can't open ${subject}.`

  return (
    <Surface padding="lg" className={className}>
      <div className="flex flex-col items-start gap-3">
        <Heading level={headingLevel} size="card">
          {title}
        </Heading>
        <Text className="max-w-prose">{body}</Text>
        <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          {variant === 'signed-out' ? (
            <Button href={loginHref(returnTo)}>Log in</Button>
          ) : (
            <Button href="/app">Go to My PG</Button>
          )}
          {children}
        </div>
      </div>
    </Surface>
  )
}
