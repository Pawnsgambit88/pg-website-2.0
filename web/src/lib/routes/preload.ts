// Intent preload for `next/dynamic` features (RBP bundle-preload, ARCH-001 14.4). Next's <Link> already prefetches
// routes; this covers the other half: a lazy client chunk that a predictable action will need.
//
//   const preloadSheet = createPreload(() => import('./ResultSheet'))   // literal path (M12)
//   <button onPointerEnter={preloadSheet} onFocus={preloadSheet}>Submit result</button>

/**
 * Returns a function that starts `load` at most once and never throws. A failed load is forgotten, so the next
 * intent (or the real mount, which loads through `next/dynamic` anyway) retries. Safe to call during render on the
 * server: it does nothing there, so the chunk is not pulled into the server bundle by the preload alone.
 */
export function createPreload(load: () => Promise<unknown>): () => void {
  let started = false
  return () => {
    if (started || typeof window === 'undefined') return
    started = true
    load().catch(() => {
      started = false
    })
  }
}
