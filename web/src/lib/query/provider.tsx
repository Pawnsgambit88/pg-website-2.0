'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { getBrowserClient } from '@/lib/api/browser/client'
import { createQueryClient } from '@/lib/query/client'
import { clearCacheOnSessionEnd } from '@/lib/query/session-end'

// QueryProvider: mounted by the (auth), (app) and (admin) layouts only (TASK-023 wires it; never (public), M3).
//   - The QueryClient is created in a useState initialiser: once per mounted provider, so once per browser session, and
//     never shared between server requests. StrictMode's double render discards the extra instance; the double effect
//     subscribes, unsubscribes and subscribes again, which is harmless.
//   - On the token manager's session-ended event the whole cache is cleared. The subscription lives in an effect, so it
//     never runs on the server (and the browser client, which throws without `window`, is only touched in the browser).

export function QueryProvider({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => clearCacheOnSessionEnd(queryClient, getBrowserClient().tokens), [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
