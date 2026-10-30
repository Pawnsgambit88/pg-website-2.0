import 'server-only'
import { z } from 'zod'
import { sendRequest, type FetchLike } from '@/lib/api/http'
import { resolveApiUrl } from '@/lib/api/url'
import { isAllowedPreviewPath, isOpaqueToken } from './path.ts'

// Server-to-server exchange of a single-use preview link token (contract 3.10 `POST /api/preview/exchange`).
// PREVIEW_SECRET is sent as a Bearer header from the server only; it never reaches the browser, a URL or a log.

const TIMEOUT_MS = 10_000

const exchangeSchema = z.object({
  path: z.string(),
  previewKey: z.string(),
  expiresAt: z.string(),
})

export interface PreviewGrant {
  /** Validated against the allow-list. */
  readonly path: string
  readonly previewKey: string
  /** Epoch milliseconds the key stops working at (falls back to now + 5 min when unparsable). */
  readonly expiresAtMs: number
}

export interface ExchangeConfig {
  origin: string
  secret: string
  fetchImpl?: FetchLike
}

/** Returns the grant, or null for any failure (bad/used/expired token, wrong secret, bad response). Never throws. */
export async function exchangePreviewToken(token: string, config: ExchangeConfig): Promise<PreviewGrant | null> {
  if (!isOpaqueToken(token)) return null
  try {
    const url = resolveApiUrl({
      origin: config.origin,
      basePath: '/api',
      path: '/preview/exchange',
      query: undefined,
    })
    const result = await sendRequest<z.output<typeof exchangeSchema>>({
      url: url.toString(),
      init: {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.secret}`,
        },
        body: JSON.stringify({ token }),
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      },
      timeoutMs: TIMEOUT_MS,
      schema: exchangeSchema,
      fetchImpl: config.fetchImpl,
    })
    const { path, previewKey, expiresAt } = result.data
    if (!isAllowedPreviewPath(path) || !isOpaqueToken(previewKey)) return null
    const parsed = Date.parse(expiresAt)
    return { path, previewKey, expiresAtMs: Number.isNaN(parsed) ? Date.now() + 300_000 : parsed }
  } catch {
    return null
  }
}
