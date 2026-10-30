import { DEFAULT_PAGE_SIZE, type Page, type PageQuery } from '@/lib/api/types/pagination'

/** Pure page-number pagination over an array (contract 2.3). */
export function paginate<T>(items: readonly T[], query: PageQuery | undefined): Page<T> {
  const pageSize = query?.pageSize ?? DEFAULT_PAGE_SIZE
  const page = query?.page ?? 1
  const total = items.length
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}
