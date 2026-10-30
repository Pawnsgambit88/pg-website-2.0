'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { getBrowserClient } from '@/lib/api/browser/client'
import { AuthActionsContext, AuthStoreContext } from '@/features/auth/auth-context'
import { createAuthController, type AuthActions, type AuthController } from '@/features/auth/auth-controller'
import { createAuthStore, type AuthStore } from '@/features/auth/auth-store'

// AuthProvider (TASK-023; ARCH-001 12.2). Mounted by the (auth), (app) and (admin) layouts through ClientProviders,
// never by (public) (F-04, dependency-cruiser). Starts in `loading` on the server and on the first client render, then
// bootstraps in an effect. It never redirects: guards (TASK-024) and pages decide what to show for each status.

interface Session {
  store: AuthStore
  controller: AuthController
  actions: AuthActions
}

function getTokens() {
  return getBrowserClient().tokens
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const api = useApi()
  // Created once per mount (lazy initialiser): no module-level state, nothing shared between server requests.
  const [session] = useState<Session>(() => {
    const store = createAuthStore()
    const controller = createAuthController({ store, auth: api.player.auth, getTokens })
    const { login, register, logout, refreshUser } = controller
    return { store, controller, actions: Object.freeze({ login, register, logout, refreshUser }) }
  })

  useEffect(() => session.controller.start(), [session])

  return (
    <AuthStoreContext value={session.store}>
      <AuthActionsContext value={session.actions}>{children}</AuthActionsContext>
    </AuthStoreContext>
  )
}
