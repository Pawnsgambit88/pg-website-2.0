'use client'

import { useRef } from 'react'
import { FormField } from '@/components/ui/form/FormField'
import { Input } from '@/components/ui/form/Input'
import { Select } from '@/components/ui/form/Select'
import { Textarea } from '@/components/ui/form/Textarea'
import { useBuilderSelector, useStepForm } from '@/features/event-builder/context'
import { DateTimeInput } from '@/features/event-builder/fields/DateTimeInput'
import { EventTypeField } from '@/features/event-builder/fields/EventTypeField'
import { SlugField } from '@/features/event-builder/fields/SlugField'
import { basicsStepSchema, type BasicsStep as BasicsValues } from '@/lib/api/types/admin/event-builder'
import { proposeSlug } from '@/lib/api/types/admin/slug'
import { authoringSlugSchema } from '@/lib/api/types/primitives'
import { EVENT_AUDIENCES, type EventAudience } from '@/lib/api/types/event-state'
import { parseInstant } from '@/lib/format/instant'

// Builder step 1, Basics (FE-26, TASK-078, screen 38). Title, slug (suggested from the title, checked with E05, locked
// after first publish), type (E06), schedule (native pickers, IST), venue and audience.

const basicsFormSchema = basicsStepSchema.superRefine((value, ctx) => {
  const start = value.startsAt === null ? null : parseInstant(value.startsAt)
  const end = value.endsAt === null ? null : parseInstant(value.endsAt)
  if (start !== null && end !== null && end <= start) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The end must be after the start.' })
  }
})

const AUDIENCE_LABEL: Record<EventAudience, string> = {
  all_levels: 'All levels',
  beginner: 'Beginner friendly',
  solo: 'Come solo',
}
const AUDIENCE_OPTIONS = EVENT_AUDIENCES.map((value) => ({ value, label: AUDIENCE_LABEL[value] }))

export function BasicsStep() {
  const form = useStepForm<BasicsValues>('basics', { schema: basicsFormSchema })
  const { control } = form
  const eventId = useBuilderSelector((state) => state.server.id)
  const lastProposed = useRef<string | null>(null)

  // Follow the title with a proposed slug until the admin edits the slug by hand.
  const onTitleChange = (title: string) => {
    const current = form.getValues('slug')
    if (current.lock !== 'editable') return
    const existing = current.value ?? ''
    if (existing !== '' && existing !== lastProposed.current) return
    const proposal = proposeSlug(title)
    lastProposed.current = proposal
    const parsed = proposal === null ? null : authoringSlugSchema.safeParse(proposal)
    form.setValue('slug', { lock: 'editable', value: parsed?.success ? parsed.data : null }, { shouldDirty: true })
  }

  return (
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="grid min-w-0 gap-5"
      aria-label="Event basics"
    >
      {/* Row 1: Title (full width) */}
      <FormField control={control} name="title" label="Title" required>
        {(field, id) => (
          <Input
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value}
            maxLength={120}
            onBlur={field.onBlur}
            onChange={(event) => {
              field.onChange(event.target.value)
              onTitleChange(event.target.value)
            }}
          />
        )}
      </FormField>

      {/* Row 2: Type + City */}
      <div className="grid min-w-0 gap-5 min-[600px]:grid-cols-2">
        <EventTypeField control={control} />
        <FormField control={control} name="city" label="City" optionalLabel>
          {(field, id) => (
            <Input
              id={id}
              ref={field.ref}
              name={field.name}
              value={field.value}
              maxLength={80}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
      </div>

      {/* Row 3: Area + Venue */}
      <div className="grid min-w-0 gap-5 min-[600px]:grid-cols-2">
        <FormField control={control} name="area" label="Area" optionalLabel>
          {(field, id) => (
            <Input
              id={id}
              ref={field.ref}
              name={field.name}
              value={field.value}
              maxLength={80}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
        <FormField control={control} name="venueName" label="Venue" optionalLabel>
          {(field, id) => (
            <Input
              id={id}
              ref={field.ref}
              name={field.name}
              value={field.value}
              maxLength={120}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
      </div>

      {/* Row 4: Starts + Ends */}
      <div className="grid min-w-0 gap-5 min-[600px]:grid-cols-2">
        <FormField
          control={control}
          name="startsAt"
          label="Starts"
          hint="Indian Standard Time. Must not be in the past to publish."
        >
          {(field) => (
            <DateTimeInput
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        </FormField>
        <FormField control={control} name="endsAt" label="Ends" hint="Must be after the start.">
          {(field) => (
            <DateTimeInput
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        </FormField>
      </div>

      {/* Row 5: Promise (full width textarea) */}
      <FormField
        control={control}
        name="promise"
        label="One-line promise"
        optionalLabel
        hint="Shown on event cards."
      >
        {(field, id) => (
          <Textarea
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value}
            rows={3}
            maxLength={200}
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
      </FormField>

      {/* Secondary fields divider */}
      <hr className="border-line-admin" />

      {/* Slug */}
      <SlugField control={control} eventId={eventId} />

      {/* Address */}
      <FormField control={control} name="address" label="Address" optionalLabel>
        {(field, id) => (
          <Textarea
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value}
            rows={3}
            maxLength={300}
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
      </FormField>

      {/* Audience */}
      <FormField control={control} name="audience" label="Who is it for" required>
        {(field, id) => (
          <Select
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            options={AUDIENCE_OPTIONS}
          />
        )}
      </FormField>
    </form>
  )
}
