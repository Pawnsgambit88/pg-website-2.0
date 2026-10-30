import type { Metadata } from 'next'
import { AuthLayout, type AuthStoryCopy } from '@/components/layout/AuthLayout'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { ResetConfirmForm } from '@/features/auth/ResetConfirmForm'
import { ResetRequestForm } from '@/features/auth/ResetRequestForm'

// Screen 16 (TASK-053). noindex and dynamic rendering come from the (auth) layout, so reading searchParams is allowed here.
// `Referrer-Policy: no-referrer` for this path is set in lib/security/headers.ts. Two modes:
//   request  (no `?token=`)  email field, neutral confirmation whatever the email.
//   confirm  (`?token=...`)  new password + confirm. The client island reads the token from the address bar itself and
//                            removes it with history.replaceState; the token VALUE is never passed as a prop (it would be
//                            serialised into the RSC payload) and never rendered or logged here.

type SearchParams = Record<string, string | string[] | undefined>

const STORY: AuthStoryCopy = {
  eyebrow: 'My PG',
  headline: 'Back to the board in a minute.',
  body: 'Choose a new password and pick up where you left off: your events, pairings and ratings are all still here.',
}

const TOKEN_MAX = 512

function tokenParam(params: SearchParams): string | undefined {
  const value = params.token
  return Array.isArray(value) ? value[0] : value
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  return {
    title: tokenParam(await searchParams) === undefined ? 'Reset password' : 'Choose a new password',
    // Same as the route's Referrer-Policy header, in the document too (belt and braces for the token URL).
    referrer: 'no-referrer',
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const token = tokenParam(await searchParams)

  if (token !== undefined) {
    // Only a yes/no about the token crosses to the client: an empty or oversized value cannot be a real link.
    const linkUnusable = token === '' || token.length > TOKEN_MAX
    return (
      <AuthLayout story={STORY}>
        <ResetConfirmForm linkUnusable={linkUnusable} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout story={STORY}>
      <div className="grid min-w-0 gap-8">
        <div className="grid min-w-0 gap-3">
          <Eyebrow>Reset password</Eyebrow>
          <Heading level={1} size="section">
            We&apos;ll send the next step.
          </Heading>
          <Text>
            Enter the email you use for My PG. If it belongs to an account, we&apos;ll send a link to choose a new
            password.
          </Text>
        </div>
        <ResetRequestForm />
      </div>
    </AuthLayout>
  )
}
