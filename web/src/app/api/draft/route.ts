import { cookies, draftMode } from 'next/headers'
import { envPublic } from '@/lib/env/env.public'
import { envServer } from '@/lib/env/env.server'
import { exchangePreviewToken } from '@/lib/preview/exchange'
import { isAllowedPreviewPath, isOpaqueToken, PREVIEW_COOKIE } from '@/lib/preview/path'
import { reportError } from '@/lib/observe/observer'

// Draft preview entry (ARCH-001 8.4, 11.6; ARCH-001-isr-revalidation section 7; SEC-001 F-06). GET only.
// `?token=` is the single-use link from PV01. The web server exchanges it with the backend (Bearer PREVIEW_SECRET, server
// side only), validates the returned path against the allow-list, turns on Next draft mode, stores the backend preview
// key in an httpOnly cookie and redirects to the path. Every failure is the same uninformative 404 (no oracle).
// Mock builds accept the fixed token below plus `?path=` so the flow can be exercised without a backend.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MOCK_TOKEN = 'mock-preview-token-0000'
/** Mock key: a fixed placeholder, the mock public API ignores it. */
const MOCK_KEY = 'mock-preview-key-000000000'
const FALLBACK_TTL_SECONDS = 300
const MAX_TTL_SECONDS = 600

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
} as const

const deny = (): Response => Response.json({ ok: false }, { status: 404, headers: PRIVATE_HEADERS })

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const token = params.get('token')
  if (!isOpaqueToken(token) && token !== MOCK_TOKEN) return deny()

  let path: string
  let previewKey: string
  let ttlSeconds = FALLBACK_TTL_SECONDS

  if (envPublic.USE_MOCKS) {
    const mockPath = params.get('path') ?? '/'
    if (token !== MOCK_TOKEN || !isAllowedPreviewPath(mockPath)) return deny()
    path = mockPath
    previewKey = MOCK_KEY
  } else {
    const { API_INTERNAL_URL: origin, PREVIEW_SECRET: secret } = envServer
    if (origin === undefined || secret === undefined || token === MOCK_TOKEN) return deny()
    const grant = await exchangePreviewToken(token, { origin, secret })
    if (grant === null) return deny()
    path = grant.path
    previewKey = grant.previewKey
    ttlSeconds = Math.min(Math.max(Math.ceil((grant.expiresAtMs - Date.now()) / 1000), 1), MAX_TTL_SECONDS)
  }

  try {
    ;(await draftMode()).enable()
    ;(await cookies()).set(PREVIEW_COOKIE, previewKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ttlSeconds,
    })
  } catch (error) {
    reportError(error instanceof Error ? new Error(error.name) : new Error('draft-enable-failed'), {
      area: 'draft',
      action: 'enable',
    })
    return deny()
  }
  // Relative redirect: path is an allow-listed site path, never a URL.
  return new Response(null, { status: 307, headers: { ...PRIVATE_HEADERS, Location: path } })
}
