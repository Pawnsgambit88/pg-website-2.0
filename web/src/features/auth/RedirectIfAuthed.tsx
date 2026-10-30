'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { RouteLoading } from '@/components/layout/RouteLoading'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { loginDestination } from '@/features/auth/login-flow'
import { takeReturnTo } from '@/features/auth/return-to'
import { useAuthStatus, useAuthUser } from '@/features/auth/useAuth'

interface RedirectIfAuthedProps {
  /** Raw `?returnTo=` of the sign-in screen. Validated here; an unsafe value is dropped. */
  returnTo?: string
  /** The sign-in screen (the login form). Rendered while the session loads and while signed out. */
  children: ReactNode
}

/**
 * For `/login` (TASK-024; ARCH-001 12.4). A visitor who ARRIVES already signed in is sent on at once, to the same place
 * a fresh sign-in would go (`loginDestination`): the remembered intent (single use), else the validated `?returnTo=`,
 * else `/admin` for admins and `/app` for players; never an admin path for a player; `/welcome?returnTo=` first for a
 * player whose onboarding is not done. A skeleton replaces the form while that navigation runs.
 *
 * While the session loads the children render normally, so the form is never blocked by the bootstrap. Once this
 * screen has seen `signed-out`, a later sign-in is the form's own doing and the form navigates; this guard then stays
 * out of the way so there is never a double navigation.
 */
export function RedirectIfAuthed({ returnTo, children }: RedirectIfAuthedProps): ReactNode {
  const status = useAuthStatus()
  const user = useAuthUser()
  const router = useRouter()
  // Derived during render from the previous status (React "storing information from previous renders").
  const [seenSignedOut, setSeenSignedOut] = useState(false)
  if (status === 'signed-out' && !seenSignedOut) setSeenSignedOut(true)

  const arrivedSignedIn = status === 'signed-in' && user !== null && !seenSignedOut

  useEffect(() => {
    if (!arrivedSignedIn || user === null) return
    router.replace(loginDestination(user, takeReturnTo(), safeRedirect(returnTo)) as Route)
  }, [arrivedSignedIn, user, returnTo, router])

  return arrivedSignedIn ? <RouteLoading /> : children
}
