'use client'

import { Controller, useFormState, type Control } from 'react-hook-form'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { useLockedField } from '@/features/event-builder/context'
import { SLUG_STATUS_ID, SlugStatus } from '@/features/event-builder/fields/SlugStatus'
import type { BasicsStep, BuilderDraftDto } from '@/lib/api/types/admin/event-builder'
import { controlIdFor } from '@/lib/forms/ids'

interface SlugFieldProps {
  control: Control<BasicsStep>
  eventId: BuilderDraftDto['id']
}

/** Slug input: suggested upstream from the title, checked with E05, disabled with its reason once locked. */
export function SlugField({ control, eventId }: SlugFieldProps) {
  const lock = useLockedField('slug')
  const { errors } = useFormState({ control, name: 'slug' })
  const slugError = (errors.slug as { value?: { message?: string } } | undefined)?.value?.message
  return (
    <Controller
      control={control}
      name="slug"
      render={({ field }) => {
        const isLocked = lock.locked || field.value.lock === 'locked'
        const text = field.value.value ?? ''
        const reason = lock.reason ?? 'The link is fixed once an event has been published.'
        return (
          <Field
            id={controlIdFor('slug')}
            label="Event link"
            required
            hint={
              isLocked
                ? reason
                : 'Lowercase letters, numbers and hyphens. Suggested from the title; you can change it until you publish.'
            }
            error={slugError}
          >
            <Input
              ref={field.ref}
              name={field.name}
              value={text}
              disabled={isLocked}
              autoCapitalize="none"
              spellCheck={false}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange({ lock: 'editable', value: event.target.value.toLowerCase() })}
              aria-describedby={isLocked ? undefined : SLUG_STATUS_ID}
            />
            {isLocked ? null : <SlugStatus slug={text} eventId={eventId} />}
          </Field>
        )
      }}
    />
  )
}
