import 'server-only'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/api/types/pagination'

// Page-argument normalisation for the list fetchers. Callers pass primitives (React.cache compares with Object.is);
// normalising first makes `getX()` and `getX(1, 20)` share one cache entry and keeps out-of-range values off the wire.

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export function normalisePage(page: number): number {
  return clampInt(page, 1, Number.MAX_SAFE_INTEGER, 1)
}

export function normalisePageSize(pageSize: number, max: number = MAX_PAGE_SIZE): number {
  return clampInt(pageSize, 1, max, DEFAULT_PAGE_SIZE)
}
