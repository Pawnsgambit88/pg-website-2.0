import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Surface } from '@/components/ui/Surface'
import { cn } from '@/lib/cn'
import { whatHappensNextSteps, type RoomSnapshot, type StepStatus } from '@/features/player/event-room/room-state'

// ---- Static step metadata (EV-06 reference screens 24–29) ----------------------------
const STEPS: readonly { label: string; description: string }[] = [
  { label: 'Registration', description: 'Confirmed' },
  { label: 'Arrival', description: "Host knows you're coming" },
  { label: 'Pairing', description: 'Appears here when published' },
  { label: 'Result', description: 'Submit or resolve with host' },
]

function indicator(status: StepStatus, num: number): { marker: string; className: string } {
  if (status === 'done') return { marker: '✓', className: 'bg-forest text-parchment' }
  if (status === 'current') return { marker: String(num), className: 'bg-copper text-warm-white' }
  return { marker: String(num), className: 'border border-line bg-parchment-soft text-muted' }
}

/**
 * "WHAT HAPPENS NEXT" 4-step journey panel (EV-06, reference screens 24–29).
 * Ticks derive from `roomState` and `checkIn`; no client guesses.
 */
export function WhatHappensNextPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const steps = whatHappensNextSteps(snapshot)
  return (
    <Surface as="article" aria-labelledby="what-next-heading">
      <Eyebrow>WHAT HAPPENS NEXT</Eyebrow>
      <Heading level={2} size="card" id="what-next-heading" className="mt-1">
        Nothing to figure out.
      </Heading>
      <ol className="mt-4 flex flex-col gap-3" aria-label="Event journey steps">
        {STEPS.map((step, i) => {
          const status = steps[i]!
          const isDone = status === 'done'
          const isCurrent = status === 'current'
          const { marker, className: indicatorClass } = indicator(status, i + 1)
          return (
            <li key={step.label} className={cn('flex items-start gap-3', !isDone && !isCurrent && 'opacity-50')}>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex h-6 w-6 flex-none items-center justify-center text-xs font-bold',
                  indicatorClass,
                )}
              >
                {marker}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isDone ? 'text-ink' : isCurrent ? 'text-copper-dark' : 'text-muted',
                  )}
                >
                  {step.label}
                </p>
                <p className={cn('text-xs', isDone ? 'text-ink-soft' : 'text-muted')}>{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </Surface>
  )
}
