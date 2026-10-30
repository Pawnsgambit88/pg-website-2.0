'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/feedback/useToast'
import { consumeExplicitSignOut, markExplicitSignOut } from '@/features/auth/explicit-sign-out'
import { useAuthActions } from '@/features/auth/useAuth'

/**
 * Signs the player out: `logout()` (server revoke best effort, local wipe, other tabs signed out), then a success toast
 * and a replace to `/login`. `/login` rather than `/` on purpose: the (auth) group mounts a Toaster, so the toast stays
 * visible after the (app) layout unmounts; the (public) group has no toast host. A replace keeps Back from returning
 * to a signed-in page. Busy state blocks a double click; nothing here throws. `logout` is documented never to reject;
 * if it ever does, the player sees an error toast and can try again instead of being left on a dead button.
 */
export function SignOutButton() {
  const { logout } = useAuthActions()
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState(false)
  // Synchronous guard: state updates are not visible to a second click in the same frame.
  const busy = useRef(false)

  const signOut = async (): Promise<void> => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    // Tells RequireAuth this sign-out was deliberate, so it leaves the navigation below to us (plain /login).
    markExplicitSignOut()
    try {
      await logout()
    } catch {
      consumeExplicitSignOut()
      busy.current = false
      setPending(false)
      toast.error('We could not sign you out. Try again.')
      return
    }
    toast.success('You are signed out.')
    router.replace('/login')
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      fullWidth
      loading={pending}
      loadingLabel="Signing out"
      onClick={() => {
        void signOut()
      }}
    >
      Sign out
    </Button>
  )
}
