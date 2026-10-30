'use client'

import { useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { FormErrorSummary } from '@/components/ui/form/FormErrorSummary'
import { Switch } from '@/components/ui/form/Switch'
import { useToast } from '@/components/ui/feedback/useToast'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import type { ProfileDto, PublicIdentityFlags } from '@/lib/api/types/profile'
import { useZodForm } from '@/lib/forms/useZodForm'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import type { DirtyStore } from '@/features/player/shared/dirty-store'
import { PublicPreview } from '@/features/player/profile/PublicPreview'
import { PUBLIC_TOGGLES, publicFormSchema, type PublicFormValues } from '@/features/player/profile/profile-form'

interface PublicIdentityFormProps {
  profile: ProfileDto
  dirtyStore: DirtyStore
}

const DIRTY_KEY = 'public'

function flagsOf(flags: PublicIdentityFlags): PublicFormValues {
  return {
    showDisplayName: flags.showDisplayName,
    showRatings: flags.showRatings,
    showChessComHandle: flags.showChessComHandle,
    showCityChapter: flags.showCityChapter,
  }
}

/**
 * Public chess identity (M13, M15): four switches, a live preview of exactly what becomes public, and its own Save
 * (a separate resource from the private account, so a toggle can never carry a private field). There is no switch for
 * email, phone or birthday: they are stated as "Never public". Only the preview subscribes to the switch values.
 */
export function PublicIdentityForm({ profile, dirtyStore }: PublicIdentityFormProps) {
  const api = useApi()
  const toast = useToast()
  const form = useZodForm(publicFormSchema, { defaultValues: flagsOf(profile.publicIdentity) })
  const { control, handleSubmit, reset, formState } = form
  const { isDirty, isSubmitting } = formState
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    dirtyStore.set(DIRTY_KEY, isDirty)
    return () => {
      dirtyStore.set(DIRTY_KEY, false)
    }
  }, [dirtyStore, isDirty])

  const mutation = useApiMutation({
    mutationFn: (flags: PublicFormValues) => api.player.profile.updatePublicIdentity(flags),
    invalidates: () => [qk.profile()],
    idempotent: false,
  })

  const onValid = async (values: PublicFormValues) => {
    setMessage(undefined)
    try {
      const next = await mutation.mutateAsync(values)
      reset(flagsOf(next.publicIdentity))
      toast.success('Public identity saved.')
    } catch (error) {
      if (isAbortError(error)) return
      const copy = copyFor(error, { action: 'save your public identity' })
      setMessage(`${copy.title} ${copy.body} Your switches are unchanged.`)
      setFocusToken((token) => token + 1)
    }
  }

  return (
    <Surface as="section" aria-labelledby="public-title" padding="lg" className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>Public chess identity</Eyebrow>
          <StatusBadge tone="copper">Visible to players</StatusBadge>
        </div>
        <Heading level={2} size="panel" id="public-title">
          What other players may see.
        </Heading>
      </div>

      <form
        noValidate
        aria-labelledby="public-title"
        onSubmit={(event) => void handleSubmit(onValid)(event)}
        className="grid min-w-0 gap-5"
      >
        <FormErrorSummary errors={[]} message={message} focusToken={focusToken} />
        <div className="grid min-w-0 gap-2">
          {PUBLIC_TOGGLES.map((toggle) => (
            <Controller
              key={toggle.name}
              control={control}
              name={toggle.name}
              render={({ field }) => (
                <Switch
                  ref={field.ref}
                  name={field.name}
                  label={toggle.label}
                  description={toggle.hint}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  className="border-t border-line pt-2 first:border-t-0 first:pt-0"
                />
              )}
            />
          ))}
        </div>

        <PublicPreview control={control} profile={profile} />

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" loading={isSubmitting} loadingLabel="Saving">
            Save public identity
          </Button>
          <div aria-live="polite">
            <Text variant="small" tone="inherit">
              {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </Text>
          </div>
        </div>
      </form>
    </Surface>
  )
}
