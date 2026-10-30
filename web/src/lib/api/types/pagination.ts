import { z } from 'zod'
import { countSchema } from '@/lib/api/types/primitives'

// Page-number pagination (backend contract 2.3, DEC-B02). Never URLs: `next` links are rejected (F-16, NCT-L16).

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/** Wire form in `meta.pagination` (snake_case envelope keys, DEC-B03). */
export const paginationWireSchema = z.object({
  page: z.int().min(1),
  page_size: z.int().min(1).max(1000), // sitemap entries allow up to 1000 (contract P10)
  total: countSchema,
  total_pages: countSchema,
})
export type PaginationWire = z.infer<typeof paginationWireSchema>

/** Client form (camelCase) carried by `Page<T>`. */
export const paginationMetaSchema = z.object({
  page: z.int().min(1),
  pageSize: z.int().min(1).max(1000),
  total: countSchema,
  totalPages: countSchema,
})
export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export function toPaginationMeta(wire: PaginationWire): PaginationMeta {
  return { page: wire.page, pageSize: wire.page_size, total: wire.total, totalPages: wire.total_pages }
}

/** `Page<T>`: what list methods return after the envelope normaliser merges `data` and `meta.pagination`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), pagination: paginationMetaSchema })
}
export interface Page<T> {
  items: T[]
  pagination: PaginationMeta
}

/** Query accepted by every paginated list. Page size defaults to 20, maximum 100 (1000 for sitemap entries). */
export const pageQuerySchema = z.object({
  page: z.int().min(1).optional(),
  pageSize: z.int().min(1).max(MAX_PAGE_SIZE).optional(),
})
export type PageQuery = z.infer<typeof pageQuerySchema>
