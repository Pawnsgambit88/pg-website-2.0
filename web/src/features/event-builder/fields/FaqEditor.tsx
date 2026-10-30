'use client'

import { useFieldArray, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/form/FormField'
import { Input } from '@/components/ui/form/Input'
import { Textarea } from '@/components/ui/form/Textarea'
import { Text } from '@/components/ui/Text'
import type { ExperienceStep } from '@/lib/api/types/admin/event-builder'

const MAX_FAQ = 20

/** Question and answer rows, at most 20. */
export function FaqEditor({ control }: { control: Control<ExperienceStep> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'faq' })
  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="type-label text-ink">Questions people ask</legend>
      {fields.length === 0 ? <Text variant="small">No questions yet.</Text> : null}
      {fields.map((item, index) => (
        <div key={item.id} className="grid min-w-0 gap-4 rounded-public border border-muted p-4">
          <FormField control={control} name={`faq.${index}.question`} label={`Question ${index + 1}`}>
            {(field, id) => (
              <Input
                id={id}
                ref={field.ref}
                name={field.name}
                value={field.value}
                maxLength={200}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          </FormField>
          <FormField control={control} name={`faq.${index}.answer`} label={`Answer ${index + 1}`}>
            {(field, id) => (
              <Textarea
                id={id}
                ref={field.ref}
                name={field.name}
                value={field.value}
                rows={4}
                maxLength={1500}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          </FormField>
          <Button variant="ghost" onClick={() => remove(index)}>
            Remove question {index + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={fields.length >= MAX_FAQ}
        onClick={() => append({ question: '', answer: '' })}
      >
        Add a question
      </Button>
    </fieldset>
  )
}
