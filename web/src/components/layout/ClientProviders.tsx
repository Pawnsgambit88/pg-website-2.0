'use client'

import type { ReactNode } from 'react'
import { LiveRegion } from '@/components/ui/feedback/LiveRegion'
import { Toaster } from '@/components/ui/feedback/Toaster'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { QueryProvider } from '@/lib/query/provider'

// Providers for the client route groups (auth, app, admin) only, never (public) (ARCH-001 6.1, 11.9, 12.2; M3, F-04).
// Order: QueryProvider outside AuthProvider, so the cache is cleared on the same session-ended event that signs the
// user out (both subscribe to the TokenManager). LiveRegion comes before the content that announces into it; the
// Toaster is the one toast host.

export function ClientProviders({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryProvider>
      <AuthProvider>
        <LiveRegion />
        {children}
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  )
}
