'use client'

import type { MeDto, PreferencesInput } from '@/lib/api/types/auth'
import { safeRedirect } from '@/lib/security/safe-redirect'

// Pure pieces of the first-login preferences screen (TASK-054, screen 17; M16 `PATCH /me/preferences`). Kept out of
// WelcomeForm.tsx so the component stays declarative. Option values are exactly the enums of `preferencesInputSchema`
// (lib/api/types/auth.ts: PLAY_STYLES, MOODS); the copy is the reference screen's.

export type PlayStyle = NonNullable<PreferencesInput['playStyle']>
export type Mood = NonNullable<PreferencesInput['mood']>

export interface WelcomeOption<T extends string> {
  value: T
  label: string
  description: string
}

/** Question 1, `playStyle`: how the person tends to play. */
export const PLAY_STYLE_OPTIONS: readonly WelcomeOption<PlayStyle>[] = [
  {
    value: 'figuring_out',
    label: 'Still figuring chess out',
    description: 'I know the basics. I want a comfortable first game.',
  },
  { value: 'mostly_online', label: 'Mostly online', description: 'I know my way around Chess.com or Lichess.' },
  { value: 'club_player', label: 'Regular club player', description: 'I play over the board and like a challenge.' },
  {
    value: 'tournament_player',
    label: 'I play tournaments',
    description: 'I’m comfortable with clocks, pairings and ratings.',
  },
]

/** Question 2, `mood`: what they want from PG. */
export const MOOD_OPTIONS: readonly WelcomeOption<Mood>[] = [
  { value: 'play', label: 'Play', description: 'Just give me a board.' },
  { value: 'improve', label: 'Improve', description: 'I want tougher games.' },
  { value: 'compete', label: 'Compete', description: 'Make it matter.' },
  { value: 'meet_people', label: 'Meet people', description: 'Chess is the excuse.' },
]

export interface WelcomeChoices {
  playStyle: PlayStyle | null
  mood: Mood | null
}

/** The Save payload: only the answered questions (both are optional in the schema, unknown keys are refused). */
export function savePayload(choices: WelcomeChoices): PreferencesInput {
  const input: PreferencesInput = {}
  if (choices.playStyle !== null) input.playStyle = choices.playStyle
  if (choices.mood !== null) input.mood = choices.mood
  return input
}

/** The Skip payload: no answers, `skipped: true`, so the server still marks onboarding done. */
export const SKIP_PAYLOAD: PreferencesInput = { skipped: true }

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?')
}

function isWelcomePath(path: string): boolean {
  return path === '/welcome' || path.startsWith('/welcome/') || path.startsWith('/welcome?')
}

/**
 * Where the screen continues after Save or Skip: the `?returnTo=` value when `safeRedirect` accepts it (same-site page,
 * never an auth screen), otherwise `/app`. `/welcome` itself is refused (no loop), and a player is never sent to an
 * `/admin` path (same rule as `loginDestination`). A pending registration arrives here as
 * `?returnTo=/events/<slug>/register` and is resumed whether the save worked or not.
 */
export function welcomeDestination(returnTo: string | undefined, user: Pick<MeDto, 'role'> | null): string {
  const target = safeRedirect(returnTo)
  if (target === undefined || isWelcomePath(target)) return '/app'
  if (user?.role !== 'admin' && isAdminPath(target)) return '/app'
  return target
}
