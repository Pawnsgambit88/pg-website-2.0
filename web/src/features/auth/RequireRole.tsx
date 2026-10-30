'use client'

import type { ReactNode } from 'react'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { PermissionState } from '@/components/ui/feedback/PermissionState'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { useAuthRole } from '@/features/auth/useAuth'

interface RequireRoleProps {
  /** The role the area needs. Only `admin` gates anything today (players are covered by `RequireAuth`). */
  requiredRole: 'admin'
  /** The protected content. Mounted only for a signed-in user with the role, so no admin data request starts otherwise (AC-05). */
  children: ReactNode
  /** Wrap the waiting and denied states in <main>; set it when children supplies its own <main> (the admin shell does). */
  ownLandmark?: boolean
}

/**
 * Role gate for the (admin) layout (TASK-024; ARCH-001 12.5). Wraps `RequireAuth`, so loading shows the skeleton and a
 * signed-out visitor is sent to `/login?returnTo=`. A signed-in user without the role sees PermissionState
 * `role-required` with a way to the player home. UX only: the backend refuses admin calls for non-admins regardless.
 */
export function RequireRole({ requiredRole, children, ownLandmark = false }: RequireRoleProps): ReactNode {
  const userRole = useAuthRole()
  const body = (
    <div className="shell py-12">
      <PermissionState variant="role-required" role={requiredRole} headingLevel={1} />
    </div>
  )
  const denied = ownLandmark ? <MainLandmark>{body}</MainLandmark> : body
  return <RequireAuth ownLandmark={ownLandmark}>{userRole === requiredRole ? children : denied}</RequireAuth>
}
