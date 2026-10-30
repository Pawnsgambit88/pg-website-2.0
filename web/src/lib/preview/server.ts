import 'server-only'
import { cookies, draftMode } from 'next/headers'
import type { ReadOpts } from '@/lib/api/pg-api'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { isOpaqueToken, PREVIEW_COOKIE } from './path.ts'

/**
 * The preview key for this request, or null. Reads request APIs ONLY when Next draft mode is on: `draftMode()` does not
 * make a prerendered route dynamic, and a draft-mode request is always rendered on demand (Next bypasses the cache), so
 * published pages stay static/ISR while a previewer gets a private render.
 */
export async function getPreviewKey(): Promise<string | null> {
  const draft = await draftMode()
  if (!draft.isEnabled) return null
  const value = (await cookies()).get(PREVIEW_COOKIE)?.value
  return isOpaqueToken(value) ? value : null
}

/** Read options for a public fetcher: cached and tagged for visitors, private and uncached for a previewer. */
export async function publicReadOpts(tags: string[]): Promise<ReadOpts> {
  const previewKey = await getPreviewKey()
  return previewKey === null ? { tags, revalidate: PUBLIC_REVALIDATE_SECONDS } : { previewKey }
}
