'use client'

import { sendRequest } from '@/lib/api/http'
import type { AvailabilityDto } from '@/lib/api/types/event-state'
import type { Slug } from '@/lib/api/types/primitives'
import { publicResponses } from '@/lib/api/types/response-schemas'
import { resolveApiUrl, seg } from '@/lib/api/url'
import { envPublic } from '@/lib/env/env.public'

// Public-only availability transport (TASK-123, contract P04 `GET /events/{slug}/availability`, no-store). The (public)
// group may not reach useApi(): it pulls lib/api/browser (token store, refresh, session lock), which SEC-001 F-04 /
// dependency-cruiser rule m3-public-no-token-or-auth-code ban from public bundles. This read carries no credential:
//   - same-origin URL from NEXT_PUBLIC_API_BASE_URL and the same relative path as adapters/real.ts (resolveApiUrl pins
//     the origin; the slug is a validated `Slug` and encoded with `seg`);
//   - `credentials: 'omit'`, no Authorization header, `redirect: 'error'`, `cache: 'no-store'`, 15 s timeout;
//   - payload validated with the P04 schema from the public response registry; failures arrive as ApiError
//     (NETWORK, TIMEOUT, BAD_RESPONSE, HTTP_404...). Never retried here (the hook backs off) and nothing is logged.
// MOCK SWITCH (ARCH-001 11.3): the inline `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'` literal (not an imported
// constant) so Turbopack drops the branch and the mock chunk when mocks are off, as submitContact.ts does.

const TIMEOUT_MS = 15_000

/** One availability read. Browser only. */
export async function fetchAvailability(slug: Slug, signal?: AbortSignal): Promise<AvailabilityDto> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const [{ createMockPublicApi }, { resolveBrowserMode }] = await Promise.all([
      import('@/lib/mock/adapter'),
      import('@/lib/mock/store.browser'),
    ])
    return createMockPublicApi({ getMode: resolveBrowserMode }).getEventAvailability(slug, { signal })
  }

  const url = resolveApiUrl({
    origin: window.location.origin,
    basePath: envPublic.API_BASE_URL,
    path: `/events/${seg(slug)}/availability`,
  })
  const result = await sendRequest<AvailabilityDto>({
    url: url.toString(),
    init: {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    },
    signal,
    timeoutMs: TIMEOUT_MS,
    schema: publicResponses.getEventAvailability,
  })
  return result.data
}
