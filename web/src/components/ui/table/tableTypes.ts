import type { ReactNode } from 'react'

/**
 * How a column behaves below 720px (the `sm` breakpoint).
 *  primary           shown first in the stacked card
 *  secondary         shown after the primary columns as a label: value pair
 *  hidden-on-mobile  not shown below 720px (use only for data that is repeated elsewhere or purely decorative)
 */
export type ColumnPriority = 'primary' | 'secondary' | 'hidden-on-mobile'

export interface TableColumn<Row> {
  /** Stable id (React key and header id). */
  id: string
  /** Column header. Also the label of the label: value pair in the stacked layout. */
  header: ReactNode
  /** Cell content for a row. */
  cell: (row: Row, index: number) => ReactNode
  /** `end` right-aligns currency and counts and turns on tabular numerals. Default `start`. */
  align?: 'start' | 'end'
  /** Default `secondary`. */
  priority?: ColumnPriority
  /** Fragment Mono: provider IDs, references, codes. */
  mono?: boolean
  /**
   * Marks the column that names the row: rendered as `<th scope="row">` in the table and as the card title in the
   * stacked layout. When no column is marked, the first `primary` column is used. Also carries the row link.
   */
  rowHeader?: boolean
}

/** Layout mode. `stack` (default): table from 720px, labelled cards below. `scrollable`: one table at every width inside a
 *  keyboard-focusable horizontal scroll region. The owner opts in per table, for dense tables only. */
export type TableLayout = 'stack' | 'scrollable'

/** `auto` applies content-visibility to the stacked cards once the list passes CV_ROW_THRESHOLD rows. */
export type TableVirtualize = 'auto' | 'content-visibility' | 'off'

export const CV_ROW_THRESHOLD = 30
