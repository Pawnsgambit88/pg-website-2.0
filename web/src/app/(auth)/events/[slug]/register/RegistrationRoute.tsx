'use client'

import { RegistrationFrame } from '@/features/registration/RegistrationFrame'
import { useAuthStatus } from '@/features/auth/useAuth'
import type { Slug } from '@/lib/api/types/primitives'

/** Binds the session status to the registration frame (a feature may not import the auth feature, M4). */
export function RegistrationRoute({ slug }: { slug: Slug }) {
  return <RegistrationFrame slug={slug} session={useAuthStatus()} />
}
