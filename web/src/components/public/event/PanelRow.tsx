import type { ReactNode } from 'react'

interface PanelRowProps {
  label: string
  children: ReactNode
}

/** One label and value row of the decision panel (reference `.event-sidecard dl > div`). Use inside a `<dl>`. */
export function PanelRow({ label, children }: PanelRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1 border-b border-line py-3 xs:grid-cols-3 xs:gap-3">
      <dt className="type-eyebrow text-muted">{label}</dt>
      <dd className="font-strong wrap-break-word xs:col-span-2">{children}</dd>
    </div>
  )
}
