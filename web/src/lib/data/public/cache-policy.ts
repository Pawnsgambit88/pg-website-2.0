import 'server-only'

// Revalidate windows for the public data layer (ARCH-001 7.3 rule 2, 9.5, 9.6). Page segment configs must still export
// the literal `export const revalidate = 900` (segment config is statically analysed); this constant is the per-fetch
// value that every cached fetcher passes through getPublicApi() to serverGet's `next: { revalidate }`.

/** Safety net for every cached public read: a missed webhook self-heals within 15 minutes (AC-17). */
export const PUBLIC_REVALIDATE_SECONDS = 900

/** Volatile reads (availability, 9.6): `0` is `cache: 'no-store'` in serverGet. Never use it in a prerendered page. */
export const VOLATILE_REVALIDATE_SECONDS = 0
