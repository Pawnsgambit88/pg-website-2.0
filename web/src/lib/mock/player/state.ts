import { z } from 'zod'
import { resultOutcomeSchema } from '@/lib/api/types/event-room'
import { registrationSchema } from '@/lib/api/types/registration'
import { scenarioSchema } from '@/lib/mock/scenario'

// The mock player "database" (TASK-019; ARCH-001 11.4). This file only DESCRIBES it: the schema, the empty value and the
// store interface. The value lives in sessionStorage `pg:mock:v1:player` (player/store.browser.ts), is read, changed and
// written back on every call, and is never held at module level. The server has no store at all.
// It holds only CHANGES on top of the frozen seeds: registrations the player created or changed, the demo Event Room
// progress, and the scenario forced for demos.

export const playerStateSchema = z.object({
  /** Registrations created or changed this session (an entry replaces the seed with the same id). */
  regs: z.array(z.object({ accountId: z.string().min(1).max(64), registration: registrationSchema })).max(50),
  /** Event Room progress of the player's current room (check-in and results). */
  room: z.object({
    checkedInAt: z.iso.datetime({ offset: true }).nullable(),
    /** What I submitted (M07). */
    mine: resultOutcomeSchema.nullable(),
    stage: z.enum(['none', 'submitted', 'final', 'disputed']),
    finalOutcome: resultOutcomeSchema.nullable(),
    /** Bumps on every change so the snapshot `version` marker changes (change detection). */
    version: z.int().min(0).max(100000),
  }),
  /** Forced states (`?mock=room:live`, ...). Empty object = natural states. */
  scenario: scenarioSchema,
  /** Counter for new registration and order ids. */
  seq: z.int().min(0).max(100000),
})
export type PlayerState = z.infer<typeof playerStateSchema>

export function initialPlayerState(): PlayerState {
  return {
    regs: [],
    room: { checkedInAt: null, mine: null, stage: 'none', finalOutcome: null, version: 1 },
    scenario: {},
    seq: 0,
  }
}

export function parsePlayerState(value: unknown): PlayerState | null {
  const result = playerStateSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Read returns a FRESH object each call; write persists it. Same contract as the auth store. */
export interface PlayerStateStore {
  read: () => PlayerState
  write: (state: PlayerState) => void
}
