import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface HeroFact {
  /** Stable key and visible label ("When", "Where"). */
  label: string
  value: ReactNode
}

interface HeroFactsProps {
  facts: readonly HeroFact[]
  className?: string
}

/**
 * Hero fact grid (reference `.event-facts`): mono copper-dark labels over strong values, two columns from 480px and one
 * below, hairlines top and bottom. A real description list. Server Component.
 */
export function HeroFacts({ facts, className }: HeroFactsProps) {
  if (facts.length === 0) return null
  return (
    <dl className={cn('grid grid-cols-1 border-y border-line xs:grid-cols-2', className)}>
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 py-3 pr-3">
          <dt className="type-eyebrow text-copper-dark">{fact.label}</dt>
          <dd className="mt-1 font-strong wrap-break-word">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
