import type { StatusTone } from '@/components/ui/StatusBadge'
import type { AdminResultDto, AdminRoundState } from '@/lib/api/types/admin/control-rounds'
import type { ResultOutcome } from '@/lib/api/types/event-room'
import type { PairingMode } from '@/lib/api/types/event-state'

export const ROUND_STATE_LABEL: Readonly<Record<AdminRoundState, string>> = {
  draft: 'Draft (players cannot see it)',
  published: 'Published (not started)',
  live: 'Live',
  completed: 'Finalised',
  void: 'Replaced',
}

export const ROUND_STATE_SHORT: Readonly<Record<AdminRoundState, string>> = {
  draft: 'Draft',
  published: 'Published',
  live: 'Live',
  completed: 'Finalised',
  void: 'Replaced',
}

export const ROUND_STATE_TONE: Readonly<Record<AdminRoundState, StatusTone>> = {
  draft: 'neutral',
  published: 'copper',
  live: 'success',
  completed: 'neutral',
  void: 'neutral',
}

export const OUTCOME_LABEL: Readonly<Record<ResultOutcome, string>> = {
  white: 'White won',
  black: 'Black won',
  draw: 'Draw',
}

export const OUTCOMES: readonly ResultOutcome[] = ['white', 'draw', 'black']

export const METHOD_LABEL: Readonly<Record<PairingMode, string>> = {
  social_balanced: 'Social balanced',
  swiss: 'Swiss',
  round_robin: 'Round robin',
  none: 'Manual',
}

/** Methods the generator can run (the server answers a field error for `none` and `round_robin`). */
export const GENERATE_METHODS: readonly PairingMode[] = ['social_balanced', 'swiss']

export function resultText(result: AdminResultDto): string {
  switch (result.state) {
    case 'none':
      return 'No result yet'
    case 'submitted':
      return `${OUTCOME_LABEL[result.outcome]} (waiting for confirmation)`
    case 'disputed':
      return `${OUTCOME_LABEL[result.outcome]} (disputed)`
    case 'final':
      return OUTCOME_LABEL[result.outcome]
  }
}

export function resultTone(result: AdminResultDto): StatusTone {
  switch (result.state) {
    case 'none':
      return 'neutral'
    case 'submitted':
      return 'warning'
    case 'disputed':
      return 'danger'
    case 'final':
      return 'success'
  }
}

export const RESULT_STATE_LABEL: Readonly<Record<AdminResultDto['state'], string>> = {
  none: 'Open',
  submitted: 'Submitted',
  disputed: 'Disputed',
  final: 'Final',
}
