import type { ReactNode } from 'react'

interface InfoRowProps {
  label: ReactNode
  /** The value. Plain text or inline markup; format money, dates and ratings with `lib/format` before passing. */
  children: ReactNode
}

/**
 * One label and value pair inside `InfoStack`. The `dt`/`dd` pair is wrapped in a `div`, which HTML allows in a `dl`.
 * Stacks (label above value) below 480px so a long value never squeezes the label; side by side from `xs` up.
 * The label is muted on light surfaces and parchment-muted inside a dark surface (muted fails on forest).
 */
export function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-t border-line py-3 in-data-[surface=dark]:border-line-light xs:flex-row xs:justify-between xs:gap-4">
      <dt className="text-muted in-data-[surface=dark]:text-parchment-muted">{label}</dt>
      <dd className="font-strong wrap-break-word xs:text-right">{children}</dd>
    </div>
  )
}
