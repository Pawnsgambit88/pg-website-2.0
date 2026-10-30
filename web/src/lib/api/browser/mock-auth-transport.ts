'use client'

import type { AuthTransport } from '@/lib/api/browser/auth-transport'
import { envPublic } from '@/lib/env/env.public'
import { createMockAuthService } from '@/lib/mock/auth/auth-service'
import { createSessionAuthStore } from '@/lib/mock/auth/store.browser'
import { createMockAuthTransport } from '@/lib/mock/auth/transport'
import { inject } from '@/lib/mock/latency'
import { resolveBrowserMode } from '@/lib/mock/store.browser'

// Mock builds only (TASK-023 part 1). Loaded by client.ts through a literal `import()` behind the build-time `USE_MOCKS`
// constant, so production output never contains it (check-build-output scans for lib/mock code and the sentinel).
// Same composition as `createBrowserMockAuthTransport()` in lib/mock/browser-api.ts. It is rebuilt here because
// browser-api.ts imports client.ts, and importing it back from client.ts would make an import cycle. If lib/mock
// moves that factory to a module that does not import client.ts, client.ts can load it directly and this file goes.

export function createMockTokenTransport(): AuthTransport {
  const service = createMockAuthService({ store: createSessionAuthStore(), googleAuth: envPublic.GOOGLE_AUTH })
  return createMockAuthTransport(service, () => inject(resolveBrowserMode(), {}))
}
