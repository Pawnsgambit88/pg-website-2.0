import { Avatar } from '@/components/ui/Avatar'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import type { StandingRow } from '@/lib/api/types/standings'

/** Standings below the essentials (mobile: after the board). Place, name, points and rounds are all text. */
export function StandingsList({ rows, myPlace }: { rows: readonly StandingRow[]; myPlace: number | null }) {
  return (
    <Surface as="section" aria-labelledby="standings-heading">
      <Eyebrow>STANDINGS</Eyebrow>
      <Heading level={2} size="panel" id="standings-heading" className="mt-1">
        Where everyone stands
      </Heading>
      {rows.length === 0 ? (
        <Text className="mt-3">Standings appear after the first round is scored.</Text>
      ) : (
        <ol className="mt-4">
          {rows.map((row) => (
            <li
              key={`${row.place}-${row.identity.displayName}`}
              className="flex min-w-0 items-center gap-3 border-t border-line py-3 cv-auto cv-h-row"
            >
              <span className="w-8 shrink-0 font-mono text-sm">{row.place}</span>
              <Avatar name={row.identity.displayName} size="sm" decorative />
              <span className="min-w-0 flex-1 wrap-break-word">
                {row.identity.displayName}
                {row.place === myPlace ? <strong className="font-strong"> (you)</strong> : null}
              </span>
              <span className="shrink-0 text-right font-mono text-sm">
                {row.score} pts
                <span className="block text-muted">{row.rounds} played</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Surface>
  )
}
