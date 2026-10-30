'use client'

import type { z } from 'zod'
import { lazyApi } from '@/lib/api/adapters/mock-switch'
import { createRealAdminApi } from '@/lib/api/adapters/real-admin'
import { createRealPlayerApi, createRealPublicApi } from '@/lib/api/adapters/real'
import { getBrowserClient, getStepUp } from '@/lib/api/browser/client'
import { promptForPassword } from '@/lib/api/browser/step-up-prompt'
import { CSRF_BOOTSTRAP_VALUE } from '@/lib/api/browser/tokens'
import type { PgApi } from '@/lib/api/pg-api'
import type { ApiRequester, RequestSpec } from '@/lib/api/requester'

// `useApi()`: the browser entry point (ARCH-001 11.3; M7). Components and TanStack Query option factories call it and
// then call PgApi methods inside `queryFn` / `mutationFn`.
//
// The returned object is created ONCE per page load and resolves the browser client LAZILY, on the first method call.
// A 'use client' component is also rendered on the server, where there is no `window`: calling `useApi()` there must not
// throw, and it must not create the token manager. Calling a METHOD on the server does throw (a mutation/auth call from a
// server render is a bug).
//
// MOCK SWITCH (ARCH-001 11.3), same as getPublicApi(): a literal dynamic import behind the build-time `USE_MOCKS`
// constant (adapters/mock-switch.ts) so the mock chunk is dead code in production.
// ADMIN (FE-12, owner decision 2026-10-28): always the real backend, even when NEXT_PUBLIC_USE_MOCKS is true. There are no admin
// mock fixtures. In a mock build the session tokens come from the mock auth service, so the real backend answers 401 to admin
// calls: run admin against a real backend with mocks off.There are no admin\n// mock fixtures. In a mock build the session tokens come from the mock auth service, so the real backend will answer 401\n// to admin calls: run admin against a real backend with mocks off (the mock dmin slot still throws if it is ever reached).

const lazyRequester: ApiRequester = {
  json: <S extends z.ZodType>(spec: RequestSpec, schema: S) => getBrowserClient().json(spec, schema),
  empty: (spec) => getBrowserClient().empty(spec),
}

/**
 * Cookie mode: the refresh and logout endpoints need `X-CSRF-Token` (contract 2.4). Body mode sends none. The bootstrap
 * value lives in tokens.ts (`CSRF_BOOTSTRAP_VALUE`, open question in the TASK-125 report) and is the only place to change.
 */
function csrfHeaders(): Readonly<Record<string, string>> | undefined {
  const { tokens } = getBrowserClient()
  return tokens.mode === 'cookie' ? { 'X-CSRF-Token': tokens.getAccessToken() ?? CSRF_BOOTSTRAP_VALUE } : undefined
}

function createAdmin(): PgApi['admin'] {
  return createRealAdminApi(lazyRequester, {
    withConditionalStepUp: (run) => getStepUp().withStepUp((grant) => run(grant?.token), promptForPassword),
  })
}

let api: PgApi | null = null

function createApi(): PgApi {
  // Inline literal, not the imported USE_MOCKS: Turbopack only drops this branch (and the mock chunk) when the condition
  // is written here as `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'` (found in TASK-023). Keep it inline.
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const mock = lazyApi(async () => (await import('@/lib/mock/browser-api')).createBrowserMockApi())
    return { public: mock.public, player: mock.player, admin: createAdmin() }
  }
  return {
    public: createRealPublicApi(lazyRequester),
    player: createRealPlayerApi(lazyRequester, { csrfHeaders }),
    admin: createAdmin(),
  }
}

/** The browser `PgApi`. Stable identity for the life of the page, so it is safe in dependency arrays. */
export function useApi(): PgApi {
  api ??= createApi()
  return api
}
