import Link from 'next/link'
import type { LinkHref } from '@/components/ui/linkHref'
import type { PaginationMeta } from '@/lib/api/types/pagination'
import { buttonClassName } from '@/components/ui/buttonStyles'

interface TablePaginationProps {
  /** `Page<T>.pagination` from the API. */
  pagination: PaginationMeta
  /** Server-driven navigation: URL for a page number (for example `?page=2`). Renders real links. */
  hrefForPage?: (page: number) => LinkHref
  /** Client-driven navigation: renders buttons. Use from a Client Component only. */
  onPageChange?: (page: number) => void
  /** Names the nav landmark when a page has several tables. */
  label?: string
}

const NAV = (blocked: boolean) =>
  buttonClassName({ variant: 'secondary', size: 'lg', fullWidth: false, blocked, loading: false })

/** Previous / next footer with "Page x of y" and the total, from the API pagination meta. Provide hrefForPage or onPageChange. */
export function TablePagination({ pagination, hrefForPage, onPageChange, label = 'Pagination' }: TablePaginationProps) {
  const { page, totalPages, total } = pagination
  if (totalPages <= 1 && total === 0) return null
  const hasPrev = page > 1
  const hasNext = page < totalPages

  function control(target: number, text: string, enabled: boolean) {
    if (!enabled) {
      return (
        <span aria-disabled="true" className={NAV(true)}>
          {text}
        </span>
      )
    }
    if (hrefForPage) {
      return (
        <Link href={hrefForPage(target)} className={NAV(false)} rel={target > page ? 'next' : 'prev'}>
          {text}
        </Link>
      )
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} className={NAV(false)}>
        {text}
      </button>
    )
  }

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line-admin px-4 py-3"
    >
      <p className="text-sm text-ink-soft tabular-nums">
        Page {page} of {Math.max(totalPages, 1)}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        {total} {total === 1 ? 'result' : 'results'}
      </p>
      <div className="flex gap-2">
        {control(page - 1, 'Previous', hasPrev)}
        {control(page + 1, 'Next', hasNext)}
      </div>
    </nav>
  )
}
