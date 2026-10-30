import { envPublic } from '@/lib/env/env.public'
import { isAllowedMediaSrc, isInternalPath, type MediaUrlPolicy } from '@/lib/api/types/primitives'

// Render-time media policy: the last gate before a `src` reaches next/image. It mirrors the images.remotePatterns entry
// in next.config.ts (one exact host, one exact bucket path, no query string, https; ARCH-001 13.3, F-24) so a URL that
// next/image would reject with a thrown error is turned into the local placeholder instead. Same-origin paths always
// pass (local /placeholders/* and other public assets).

export interface RenderMediaConfig {
  /** NEXT_PUBLIC_SUPABASE_STORAGE_HOST. Undefined in mock mode: only same-origin paths render. */
  storageHost: string | undefined
  /** NEXT_PUBLIC_MEDIA_BUCKET. */
  bucket: string | undefined
}

export function createRenderMediaPolicy({ storageHost, bucket }: RenderMediaConfig): MediaUrlPolicy {
  return (url) => {
    if (storageHost === undefined || bucket === undefined) return false
    return (
      url.protocol === 'https:' &&
      url.search === '' &&
      url.hash === '' &&
      url.port === '' &&
      url.hostname === storageHost.toLowerCase() &&
      url.pathname.startsWith(`/storage/v1/object/public/${bucket}/`) &&
      !url.pathname.includes('..')
    )
  }
}

export const renderMediaPolicy: MediaUrlPolicy = createRenderMediaPolicy({
  storageHost: envPublic.SUPABASE_STORAGE_HOST,
  bucket: envPublic.MEDIA_BUCKET,
})

/** True when `src` may be handed to next/image under `policy` (defaults to the env-derived policy). */
export function isRenderableMediaSrc(src: string, policy: MediaUrlPolicy = renderMediaPolicy): boolean {
  if (src.length === 0) return false
  // Local assets must be real paths, not protocol-relative or traversal; isAllowedMediaSrc checks that for paths too.
  if (src.startsWith('/')) return isInternalPath(src) && !src.includes('?') && !src.includes('#')
  return isAllowedMediaSrc(src, policy)
}
