// Draft preview path allow-list (ARCH-001 8.4, F-06 d). Pure, no directive. The backend returns the path to open after the
// token exchange; the web re-validates it here so a compromised or buggy response can never become an open redirect.
// Mirrors backend/content/preview.py PATH_ALLOW: relative, slug-based paths of previewable pages only.

const PATH_ALLOW = /^\/(?:|community|privacy|terms|refund-policy|(?:events|stories)\/[a-z0-9]+(?:-[a-z0-9]+)*)$/
const MAX_PATH_LENGTH = 200

/** True only for `/`, a CMS page, a legal page or an event / story detail path. No query, hash, scheme or host. */
export function isAllowedPreviewPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_PATH_LENGTH &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    PATH_ALLOW.test(value)
  )
}

/** Shape of a link token / preview key (`secrets.token_urlsafe(32)` is 43 characters of this alphabet). */
const OPAQUE = /^[A-Za-z0-9_-]{20,200}$/

export function isOpaqueToken(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE.test(value)
}

export const PREVIEW_COOKIE = 'pg_preview_key'
