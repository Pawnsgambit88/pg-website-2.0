'use client'

import type { Control } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/form/FormField'
import { Input } from '@/components/ui/form/Input'
import { Text } from '@/components/ui/Text'
import type { ExperienceStep } from '@/lib/api/types/admin/event-builder'

const MAX_LOGISTICS = 12

/** One-line logistics entries, at most 12. */
export function LogisticsEditor({ control }: { control: Control<ExperienceStep> }) {
  return (
    <FormField
      control={control}
      name="logistics"
      label="Logistics"
      group
      hint="One line each, for example parking, what to bring, when doors open."
    >
      {(field) => {
        const lines = field.value
        const set = (next: string[]) => field.onChange(next)
        return (
          <div className="grid min-w-0 gap-3">
            {lines.length === 0 ? <Text variant="small">No logistics lines yet.</Text> : null}
            {lines.map((line, index) => (
              <div key={index} className="grid min-w-0 gap-2">
                <Input
                  ref={index === 0 ? field.ref : undefined}
                  aria-label={`Logistics line ${index + 1}`}
                  value={line}
                  maxLength={400}
                  onBlur={field.onBlur}
                  onChange={(event) => set(lines.map((l, i) => (i === index ? event.target.value : l)))}
                />
                <Button
                  variant="ghost"
                  aria-label={`Remove logistics line ${index + 1}`}
                  onClick={() => set(lines.filter((_, i) => i !== index))}
                >
                  Remove line {index + 1}
                </Button>
              </div>
            ))}
            <Button variant="secondary" disabled={lines.length >= MAX_LOGISTICS} onClick={() => set([...lines, ''])}>
              Add a line
            </Button>
          </div>
        )
      }}
    </FormField>
  )
}
