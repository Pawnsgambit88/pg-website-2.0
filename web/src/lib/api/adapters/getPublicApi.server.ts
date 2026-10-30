import 'server-only'
import { lazyApi } from '@/lib/api/adapters/mock-switch'
import { createRealPublicApi } from '@/lib/api/adapters/real'
import { createServerRequester } from '@/lib/api/server/fetch'
import type { PgPublicApi } from '@/lib/api/pg-api'

// `getPublicApi()`: the server entry point for public reads (ARCH-001 11.3, 11.5; M7). Only `lib/data/public/*` calls it;
// pages and components never do (M3). Returns the PUBLIC group only: player and admin calls need the browser's token.
// Stateless: a new adapter object per call, no module-level mutable state (RBP server-no-shared-module-state).
//
// MOCK SWITCH (ARCH-001 11.3): when NEXT_PUBLIC_USE_MOCKS is on, the mock public API is loaded by a literal dynamic
// import behind the build-time constant `USE_MOCKS`, so the mock chunk is dead code in production. The server mock is a
// pure function of immutable seeds (mode 'default'); it holds no state and ignores request-specific scenarios.

export function getPublicApi(): PgPublicApi {
  // Inline literal, not the imported USE_MOCKS: Turbopack only drops this branch when the condition is written here.
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return lazyApi(async () => (await import('@/lib/mock/adapter')).createMockPublicApi())
  }
  return createRealPublicApi(createServerRequester())
}
