'use client'

import { useFieldArray, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/form/FormField'
import { Input } from '@/components/ui/form/Input'
import { Textarea } from '@/components/ui/form/Textarea'
import { Text } from '@/components/ui/Text'
import type { ExperienceStep } from '@/lib/api/types/admin/event-builder'

const MAX_HIGHLIGHTS = 8

/** Repeating highlight rows (title and text), at most 8. */
export function HighlightsEditor({ control }: { control: Control<ExperienceStep> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'highlights' })
  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="type-label text-ink">Highlights</legend>
      {fields.length === 0 ? <Text variant="small">No highlights yet.</Text> : null}
      {fields.map((item, index) => (
        <div key={item.id} className="grid min-w-0 gap-4 rounded-public border border-muted p-4">
          <FormField control={control} name={`highlights.${index}.title`} label={`Highlight ${index + 1} title`}>
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
          <FormField control={control} name={`highlights.${index}.body`} label={`Highlight ${index + 1} text`}>
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
          <Button variant="ghost" onClick={() => remove(index)}>
            Remove highlight {index + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={fields.length >= MAX_HIGHLIGHTS}
        onClick={() => append({ title: '', body: '' })}
      >
        Add a highlight
      </Button>
      {fields.length >= MAX_HIGHLIGHTS ? <Text variant="small">Up to {MAX_HIGHLIGHTS} highlights.</Text> : null}
    </fieldset>
  )
}
