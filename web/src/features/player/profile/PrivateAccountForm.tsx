'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { Field } from '@/components/ui/form/Field'
import { FormErrorSummary, type FormErrorItem } from '@/components/ui/form/FormErrorSummary'
import { Input } from '@/components/ui/form/Input'
import { useToast } from '@/components/ui/feedback/useToast'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import type { ProfileDto, ProfileUpdate } from '@/lib/api/types/profile'
import { controlIdFor } from '@/lib/forms/ids'
import { applyServerFieldErrors } from '@/lib/forms/serverErrors'
import { useZodForm } from '@/lib/forms/useZodForm'
import { qk } from '@/lib/query/keys'
import { useApiMutation } from '@/lib/query/mutation'
import type { DirtyStore } from '@/features/player/shared/dirty-store'
import {
  PRIVATE_FIELD_LABELS,
  PRIVATE_FIELDS,
  privateDefaults,
  privateFormSchema,
  privatePatch,
  type PrivateFormValues,
} from '@/features/player/profile/profile-form'

interface PrivateAccountFormProps {
  profile: ProfileDto
  dirtyStore: DirtyStore
}

const DIRTY_KEY = 'private'
const CLEAR_MESSAGE = 'A saved value cannot be removed here yet. Enter a new value or restore the old one.'

/**
 * Private account (M13, M14): only the player and authorised PG operations see this. Uncontrolled inputs (`register`),
 * so typing re-renders nothing outside this form, and in particular not the public-identity section. The save bar reads
 * `isDirty`. A failed save keeps every edit and shows the reason; server field errors land next to their inputs.
 */
export function PrivateAccountForm({ profile, dirtyStore }: PrivateAccountFormProps) {
  const api = useApi()
  const toast = useToast()
  // The last values the server confirmed; the baseline for "what changed". A ref: read only when saving.
  const saved = useRef<PrivateFormValues>(privateDefaults(profile))

  const form = useZodForm(privateFormSchema, { defaultValues: privateDefaults(profile), shouldFocusError: false })
  const { register, handleSubmit, setError, reset, formState } = form
  const { errors, isDirty } = formState
  const [formMessage, setFormMessage] = useState<string | undefined>(undefined)
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    dirtyStore.set(DIRTY_KEY, isDirty)
    return () => {
      dirtyStore.set(DIRTY_KEY, false)
    }
  }, [dirtyStore, isDirty])

  const mutation = useApiMutation({
    mutationFn: (update: ProfileUpdate) => api.player.profile.updateProfile(update),
    // `me` too: the session identity (name shown in the shell) comes from the same account.
    invalidates: () => [qk.profile(), qk.me()],
    idempotent: false,
  })

  const fail = (message: string | undefined) => {
    setFormMessage(message)
    setFocusToken((token) => token + 1)
  }

  const onValid = async (values: PrivateFormValues) => {
    setFormMessage(undefined)
    const { update, cleared } = privatePatch(values, saved.current)
    if (cleared.length > 0) {
      for (const field of cleared) setError(field, { type: 'manual', message: CLEAR_MESSAGE })
      fail(undefined)
      return
    }
    if (Object.keys(update).length === 0) return
    try {
      const next = await mutation.mutateAsync(update)
      const nextValues = privateDefaults(next)
      saved.current = nextValues
      reset(nextValues) // clears dirty, keeps the server's normalised values
      toast.success('Account details saved.')
    } catch (error) {
      if (isAbortError(error)) return
      const { applied, unmatched } = applyServerFieldErrors(error, setError, PRIVATE_FIELDS)
      const copy = copyFor(error, { action: 'save your account details' })
      const extra = Object.values(unmatched).flat()[0]
      // Field errors alone explain a 422; anything else gets the form-level copy. Edits are kept either way.
      fail(applied.length > 0 && extra === undefined ? undefined : (extra ?? `${copy.title} ${copy.body}`))
    }
  }

  const summaryItems: FormErrorItem[] = PRIVATE_FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message === undefined ? [] : [{ id: controlIdFor(name), message, label: PRIVATE_FIELD_LABELS[name] }]
  })

  return (
    <Surface as="section" aria-labelledby="private-title" padding="lg" className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>Private account</Eyebrow>
          <StatusBadge tone="neutral">Only you</StatusBadge>
        </div>
        <Heading level={2} size="panel" id="private-title">
          Only you and authorised PG operations can see this.
        </Heading>
      </div>

      <form
        noValidate
        aria-labelledby="private-title"
        onSubmit={(event) => void handleSubmit(onValid, () => fail(undefined))(event)}
        className="grid min-w-0 gap-5"
      >
        <FormErrorSummary errors={summaryItems} message={formMessage} focusToken={focusToken} />
        <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field id={controlIdFor('name')} label="Display name" error={errors.name?.message} required>
            <Input preset="name" {...register('name')} />
          </Field>
          <Field id={controlIdFor('city')} label="City" error={errors.city?.message} optionalLabel>
            <Input autoComplete="address-level2" {...register('city')} />
          </Field>
          <Field
            id={controlIdFor('email')}
            label="Email"
            hint="Your sign-in email. Never shown to other players. To change it, message the desk."
          >
            <Input preset="email" readOnly defaultValue={profile.email} />
          </Field>
          <Field
            id={controlIdFor('phone')}
            label="Phone"
            error={errors.phone?.message}
            optionalLabel
            hint="Used only to reach you about an event. Never public."
          >
            <Input preset="phone" {...register('phone')} />
          </Field>
          <Field
            id={controlIdFor('birthday')}
            label="Birthday"
            error={errors.birthday?.message}
            optionalLabel
            hint="YYYY-MM-DD. Never public."
          >
            <Input inputMode="numeric" autoComplete="bday" {...register('birthday')} />
          </Field>
          <Field id={controlIdFor('area')} label="Area" error={errors.area?.message} optionalLabel>
            <Input autoComplete="address-level3" {...register('area')} />
          </Field>
          <Field
            id={controlIdFor('chessComHandle')}
            label="Chess.com handle"
            error={errors.chessComHandle?.message}
            optionalLabel
          >
            <Input preset="username" {...register('chessComHandle')} />
          </Field>
          <Field id={controlIdFor('fideId')} label="FIDE ID" error={errors.fideId?.message} optionalLabel>
            <Input preset="integer" {...register('fideId')} />
          </Field>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" loading={formState.isSubmitting} loadingLabel="Saving">
            Save account details
          </Button>
          <Text variant="small" tone="inherit" aria-live="polite">
            {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </Text>
        </div>
      </form>
    </Surface>
  )
}
