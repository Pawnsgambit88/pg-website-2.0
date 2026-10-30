'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { ArrowRight } from '@/components/ui/icons/ArrowRight'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { isAbortError } from '@/lib/api/errors'
import type { PreferencesInput } from '@/lib/api/types/auth'
import { useAuthActions, useAuthUser } from '@/features/auth/useAuth'
import { WelcomeChoiceGroup } from '@/features/auth/WelcomeChoiceGroup'
import {
  MOOD_OPTIONS,
  PLAY_STYLE_OPTIONS,
  SKIP_PAYLOAD,
  savePayload,
  welcomeDestination,
  type WelcomeChoices,
} from '@/features/auth/welcome-flow'

interface WelcomeFormProps {
  /** Raw `?returnTo=` from the URL. Validated with `safeRedirect` in `welcomeDestination`; an unsafe value is dropped. */
  returnTo?: string
}

type Pending = 'save' | 'skip' | null

const PLAY_STYLE_NAME = 'playStyle'
const MOOD_NAME = 'mood'

/**
 * Screen 17 form island (TASK-054; M16). Two optional questions (`playStyle`, `mood`), then:
 *   Save and continue  sends the answered questions. On failure the choices stay, an error with a retry appears and the
 *                      person can also still skip.
 *   Skip for now       sends `{ skipped: true }` so the server marks onboarding done. A failed skip never blocks: the
 *                      screen moves on anyway (the worst case is seeing this screen again on a later sign-in).
 * After either, `refreshUser()` re-reads `me` (it never rejects), then the router replaces the URL with the validated
 * `?returnTo=` (for example a pending registration) or `/app`. Both buttons share one pending state and a ref guard, so
 * a double tap sends one request.
 */
export function WelcomeForm({ returnTo }: WelcomeFormProps) {
  const router = useRouter()
  const api = useApi()
  const { refreshUser } = useAuthActions()
  const user = useAuthUser()

  const [choices, setChoices] = useState<WelcomeChoices>({ playStyle: null, mood: null })
  const [pending, setPending] = useState<Pending>(null)
  const [saveError, setSaveError] = useState<unknown>(null)
  // Synchronous guard: two clicks in the same frame both see `pending === null` in state.
  const inFlight = useRef(false)

  const finish = async (): Promise<void> => {
    const fresh = await refreshUser()
    router.replace(welcomeDestination(returnTo, fresh ?? user) as Route)
  }

  const submit = async (kind: 'save' | 'skip'): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(kind)
    // A failed save's error stays up during the retry, so its busy retry button keeps focus.
    const input: PreferencesInput = kind === 'save' ? savePayload(choices) : SKIP_PAYLOAD
    try {
      await api.player.profile.savePreferences(input)
    } catch (error) {
      if (kind === 'save') {
        inFlight.current = false
        setPending(null)
        if (!isAbortError(error)) setSaveError(error)
        return
      }
      // Skip: fall through and continue. Skipping must never block the app or a pending registration.
    }
    // Stays pending while the router navigates (the screen unmounts).
    await finish()
  }

  const save = (): void => void submit('save')
  const skip = (): void => void submit('skip')

  return (
    <form
      noValidate
      aria-label="Your chess preferences"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
      className="grid min-w-0 gap-8"
    >
      <WelcomeChoiceGroup
        name={PLAY_STYLE_NAME}
        legend="Which sounds most like you?"
        options={PLAY_STYLE_OPTIONS}
        selected={choices.playStyle}
        onSelect={(playStyle) => setChoices((current) => ({ ...current, playStyle }))}
      />

      <WelcomeChoiceGroup
        name={MOOD_NAME}
        legend="What are you most in the mood for?"
        options={MOOD_OPTIONS}
        selected={choices.mood}
        onSelect={(mood) => setChoices((current) => ({ ...current, mood }))}
      />

      {saveError === null ? null : (
        <ErrorState
          error={saveError}
          action="save your preferences"
          onRetry={save}
          retrying={pending === 'save'}
          headingLevel={2}
          variant="inline"
        />
      )}

      <div className="grid min-w-0 gap-3">
        <Button
          type="submit"
          size="lg"
          fullWidth
          icon={<ArrowRight />}
          iconPosition="end"
          loading={pending === 'save'}
          loadingLabel="Saving your preferences"
          disabled={pending === 'skip'}
        >
          Save and continue
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={skip}
          loading={pending === 'skip'}
          loadingLabel="Skipping, opening My PG"
          disabled={pending === 'save'}
        >
          Skip for now
        </Button>
      </div>
    </form>
  )
}
