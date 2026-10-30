import type { Metadata } from 'next'
import { AuthLayout, type AuthStoryCopy } from '@/components/layout/AuthLayout'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { WelcomeForm } from '@/features/auth/WelcomeForm'

// Screen 17 (TASK-054). noindex and dynamic rendering come from the (auth) layout, so reading searchParams is allowed here.
// The shell stays a Server Component; WelcomeForm is the only client island, behind RequireAuth (signed-out visitors go
// to /login?returnTo=/welcome...). A player who already finished onboarding may still use the screen: no redirect.
export const metadata: Metadata = { title: 'Welcome' }

const STORY: AuthStoryCopy = {
  eyebrow: 'First login',
  headline: 'No rating exam.',
  body: 'Two quick questions so your first PG game feels right. You can skip them.',
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const returnTo = firstValue((await searchParams).returnTo)

  return (
    <AuthLayout story={STORY}>
      <div className="grid min-w-0 gap-8">
        <div className="grid min-w-0 gap-3">
          <Eyebrow>First things first</Eyebrow>
          <Heading level={1} size="section">
            How do you like to play?
          </Heading>
          <Text variant="lead">No rating exam. Just enough context to make your first PG experience better.</Text>
        </div>
        <RequireAuth>
          <WelcomeForm returnTo={returnTo} />
        </RequireAuth>
      </div>
    </AuthLayout>
  )
}
