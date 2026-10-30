import { draftMode } from 'next/headers'

/**
 * Shown only in Next draft mode (FE-04). `draftMode()` does not make a prerendered route dynamic; a visitor without the
 * bypass cookie gets the static page with nothing rendered here. The robots meta is hoisted into <head> by React and
 * adds `noindex` to a draft render (the draft responses are also `private, no-store`).
 */
export async function PreviewBanner() {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return null
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div
        role="status"
        className="flex min-h-tap flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-forest px-4 py-2 type-button text-parchment"
      >
        <p>Draft preview. Visitors cannot see this. Not indexed.</p>
        {/* A route handler, not a page: a plain anchor so nothing is prefetched (prefetch would not exit, but is noise). */}
        <a href="/api/draft/exit" className="inline-flex min-h-tap items-center underline">
          Exit preview
        </a>
      </div>
    </>
  )
}
