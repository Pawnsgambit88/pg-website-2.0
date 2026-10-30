'use client'

import { ChoiceCard } from '@/components/ui/form/ChoiceCard'
import { Field } from '@/components/ui/form/Field'
import type { WelcomeOption } from '@/features/auth/welcome-flow'

interface WelcomeChoiceGroupProps<T extends string> {
  /** Radio group name, also the schema field (`playStyle`, `mood`). */
  name: string
  legend: string
  options: readonly WelcomeOption<T>[]
  selected: T | null
  onSelect: (value: T) => void
}

/**
 * One screen-17 question (TASK-054): a fieldset with a visible legend around native radio cards sharing a `name`, so
 * the browser supplies the radio group (one tab stop, arrow keys move and select). Cards stack in one column at every
 * width inside the 440px auth column. Selected state is a tick, a forest border and a copper edge bar, never colour alone.
 */
export function WelcomeChoiceGroup<T extends string>({
  name,
  legend,
  options,
  selected,
  onSelect,
}: WelcomeChoiceGroupProps<T>) {
  return (
    <Field group id={`welcome-${name}`} label={legend}>
      <div className="grid min-w-0 grid-cols-1 gap-2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            type="radio"
            id={`welcome-${name}-${option.value}`}
            name={name}
            value={option.value}
            label={option.label}
            description={option.description}
            checked={selected === option.value}
            onCheckedChange={(checked) => {
              if (checked) onSelect(option.value)
            }}
          />
        ))}
      </div>
    </Field>
  )
}
