'use client'

import { sendRequest } from '@/lib/api/http'
import type { ContactInput } from '@/lib/api/types/contact'
import type { IdempotencyKey } from '@/lib/api/types/primitives'
import { resolveApiUrl } from '@/lib/api/url'
import { envPublic } from '@/lib/env/env.public'

// Public-only contact transport (TASK-048, contract P11 `POST /contact`). The (public) group may not reach useApi():
// it pulls lib/api/browser (token store, refresh, session lock), which SEC-001 F-04 / dependency-cruiser rule
// m3-public-no-token-or-auth-code ban from public bundles. This call carries no credential, so it needs none of that:
//   - same-origin URL built from NEXT_PUBLIC_API_BASE_URL and a fixed relative path (resolveApiUrl pins the origin);
//   - `credentials: 'omit'`, no Authorization header, `redirect: 'error'`, 15 s timeout (same as the browser client);
//   - the caller's Idempotency-Key, created when the intent starts and reused for retries (ARCH-001 11.8);
//   - failures arrive as ApiError (NETWORK, TIMEOUT, RATE_LIMITED with retryAfter, VALIDATION_FAILED with fields...).
//     Never retried here and nothing is logged (no body, no URL).
// MOCK SWITCH (ARCH-001 11.3): the inline `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'` literal (not an imported
// constant) so Turbopack drops the branch and the mock chunk when mocks are off, exactly as useApi.browser.ts does.
// The mock answers from the browser only and counts sends in the session store (lib/mock/README.md).

const CONTACT_PATH = '/contact'
const TIMEOUT_MS = 15_000

/** Sends one contact message. Resolves when the backend accepted it (202). Browser only. */
export async function submitContact(input: ContactInput, key: IdempotencyKey, signal?: AbortSignal): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const [{ createMockPublicApi }, { recordContactSent, resolveBrowserMode }] = await Promise.all([
      import('@/lib/mock/adapter'),
      import('@/lib/mock/store.browser'),
    ])
    const mock = createMockPublicApi({ getMode: resolveBrowserMode, onContactSent: () => void recordContactSent() })
    return mock.submitContact(input, key, { signal })
  }

  const url = resolveApiUrl({ origin: window.location.origin, basePath: envPublic.API_BASE_URL, path: CONTACT_PATH })
  await sendRequest({
    url: url.toString(),
    init: {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(input),
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    },
    signal,
    timeoutMs: TIMEOUT_MS,
  })
}
