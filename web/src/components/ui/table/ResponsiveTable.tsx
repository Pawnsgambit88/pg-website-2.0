import Link from 'next/link'
import type { LinkHref } from '@/components/ui/linkHref'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { TableSkeleton } from './TableSkeleton'
import { CV_ROW_THRESHOLD, type TableColumn, type TableLayout, type TableVirtualize } from './tableTypes'

interface ResponsiveTableProps<Row> {
  /** Names the table for assistive technology (rendered as a screen-reader-only caption and as the list label). Required. */
  caption: string
  columns: readonly TableColumn<Row>[]
  rows: readonly Row[]
  /** Stable unique key per row (the API id). */
  getRowId: (row: Row) => string
  /** Real link on the row header (table) and card title (stacked). Return null for rows with no detail page. */
  rowHref?: (row: Row) => LinkHref | null
  /** Trailing actions cell (buttons or links, each 44px). Rendered as a column in the table and a footer in the card. */
  actions?: (row: Row) => ReactNode
  /** Visually hidden header of the actions column. */
  actionsLabel?: string
  /** Shown instead of the table when `rows` is empty (an EmptyState). */
  empty?: ReactNode
  /** Shows the loading slot instead of rows. */
  loading?: boolean
  /** Replaces the default TableSkeleton. */
  loadingSlot?: ReactNode
  /** Pagination footer (TablePagination) or any footer. */
  footer?: ReactNode
  /** Sticky header from 720px. Sticks to the viewport top, so it does not work together with layout="scrollable". */
  stickyHeader?: boolean
  /** `stack` (default) or `scrollable`; see TableLayout. */
  layout?: TableLayout
  /** content-visibility on the stacked rows: `auto` (default, from CV_ROW_THRESHOLD rows), `content-visibility` (always), `off`. */
  virtualize?: TableVirtualize
  className?: string
}

const ALIGN_CLASS = { start: 'text-left', end: 'text-right tabular-nums' } as const

function cellClass<Row>(col: TableColumn<Row>) {
  return cn(ALIGN_CLASS[col.align ?? 'start'], col.mono && 'font-mono', 'wrap-break-word')
}

/**
 * A real `<table>` from 720px and labelled stacked cards below. Server Component (cell functions run on the server unless
 * the caller is a Client Component).
 *
 * Accessibility: two renderings of the same rows are emitted, and the inactive one is `display: none` through Tailwind
 * responsive classes (`hidden sm:block` / `sm:hidden`), so it is removed from the accessibility tree: exactly one is ever
 * exposed. Below 720px a row is an `<li>` in a labelled `<ul>`; each value is a `<dd>` paired with its column header as `<dt>`.
 * No cell content may carry ids (it renders twice): use classes or data attributes.
 */
export function ResponsiveTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  rowHref,
  actions,
  actionsLabel = 'Actions',
  empty,
  loading = false,
  loadingSlot,
  footer,
  stickyHeader = false,
  layout = 'stack',
  virtualize = 'auto',
  className,
}: ResponsiveTableProps<Row>) {
  const scrollable = layout === 'scrollable'
  const titleCol = columns.find((c) => c.rowHeader) ?? columns.find((c) => (c.priority ?? 'secondary') === 'primary')
  const primary = columns.filter((c) => c !== titleCol && c.priority === 'primary')
  const secondary = columns.filter((c) => c !== titleCol && (c.priority ?? 'secondary') === 'secondary')
  const useCv = virtualize === 'content-visibility' || (virtualize === 'auto' && rows.length > CV_ROW_THRESHOLD)
  // Estimated card height in rem (padding + title + one line per pair + actions) so the scrollbar does not jump.
  const cardRem = 2 + (titleCol ? 1.75 : 0) + (primary.length + secondary.length) * 1.5 + (actions ? 3 : 0)
  const cvStyle = useCv ? ({ '--cv-h': `${cardRem}rem` } as CSSProperties) : undefined

  let body: ReactNode
  if (loading) {
    body = loadingSlot ?? <TableSkeleton />
  } else if (rows.length === 0) {
    body = empty ?? null
  } else {
    body = (
      <>
        <div
          className={cn(scrollable ? 'block overflow-x-auto' : 'hidden sm:block')}
          // A scroll region must be reachable by keyboard (WCAG 2.1.1).
          {...(scrollable ? { tabIndex: 0, role: 'region', 'aria-label': caption } : {})}
        >
          <table className={cn('w-full border-collapse text-sm', scrollable && 'min-w-max')}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={cn(
                      'border-b border-line-admin bg-admin-panel px-3 py-3 type-eyebrow font-normal text-ink-soft',
                      ALIGN_CLASS[col.align ?? 'start'],
                      stickyHeader && !scrollable && 'sm:sticky sm:top-0 sm:z-10',
                    )}
                  >
                    {col.header}
                  </th>
                ))}
                {actions ? (
                  <th scope="col" className="border-b border-line-admin bg-admin-panel px-3 py-3">
                    <span className="sr-only">{actionsLabel}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const href = rowHref?.(row) ?? null
                return (
                  <tr key={getRowId(row)} className="border-b border-line-admin last:border-b-0">
                    {columns.map((col) => {
                      const content = col.cell(row, index)
                      const isHeader = col === titleCol
                      const inner =
                        isHeader && href ? (
                          <Link href={href} className="tap underline-offset-4 hover:underline">
                            {content}
                          </Link>
                        ) : (
                          content
                        )
                      return isHeader ? (
                        <th key={col.id} scope="row" className={cn('px-3 py-3 font-medium text-ink', cellClass(col))}>
                          {inner}
                        </th>
                      ) : (
                        <td key={col.id} className={cn('px-3 py-3 align-top', cellClass(col))}>
                          {inner}
                        </td>
                      )
                    })}
                    {actions ? (
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">{actions(row)}</div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {scrollable ? null : (
          <ul aria-label={caption} className="grid sm:hidden">
            {rows.map((row, index) => {
              const href = rowHref?.(row) ?? null
              const title = titleCol ? titleCol.cell(row, index) : null
              return (
                <li
                  key={getRowId(row)}
                  style={cvStyle}
                  className={cn('border-b border-line-admin p-4 last:border-b-0', useCv && 'cv-auto')}
                >
                  {titleCol ? (
                    <div className="font-medium wrap-break-word text-ink">
                      {href ? (
                        <Link href={href} className="tap underline underline-offset-4">
                          {title}
                        </Link>
                      ) : (
                        title
                      )}
                    </div>
                  ) : null}
                  {primary.length + secondary.length > 0 ? (
                    <dl className="mt-2 grid gap-1">
                      {[...primary, ...secondary].map((col) => (
                        <div key={col.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3">
                          <dt className="text-ink-soft">{col.header}</dt>
                          <dd
                            className={cn(
                              'm-0 wrap-break-word',
                              col.priority === 'primary' ? 'text-ink' : 'text-ink-soft',
                              col.mono && 'font-mono',
                              col.align === 'end' && 'tabular-nums',
                            )}
                          >
                            {col.cell(row, index)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div> : null}
                </li>
              )
            })}
          </ul>
        )}
      </>
    )
  }

  return (
    <div
      className={cn('min-w-0 border border-line-admin bg-admin-panel text-ink', className)}
      aria-busy={loading || undefined}
    >
      {body}
      {footer}
    </div>
  )
}
