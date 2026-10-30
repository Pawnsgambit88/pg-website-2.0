import { cookies, draftMode } from 'next/headers'
import { PREVIEW_COOKIE } from '@/lib/preview/path'

// Leaves draft preview: turns off draft mode, deletes the preview key cookie, redirects home. GET only (a plain link in
// the preview banner). Idempotent and safe to call without a session.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  ;(await draftMode()).disable()
  ;(await cookies()).delete(PREVIEW_COOKIE)
  return new Response(null, {
    status: 307,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', Location: '/' },
  })
}
