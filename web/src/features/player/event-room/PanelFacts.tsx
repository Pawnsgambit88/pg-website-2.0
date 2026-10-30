import type { ReactNode } from 'react'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'

/** Label / value rows inside a forest panel. */
export function PanelFacts({ rows }: { rows: readonly { label: string; value: ReactNode }[] }) {
  return (
    <InfoStack>
      {rows.map((row) => (
        <InfoRow key={row.label} label={row.label}>
          {row.value}
        </InfoRow>
      ))}
    </InfoStack>
  )
}
