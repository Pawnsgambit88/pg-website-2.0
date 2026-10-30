'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'
import { CARD_CLASS, type ChoiceCardProps, type ChoiceCardShared } from '@/components/ui/form/choiceCardShared'
import { CheckboxChoiceCard } from '@/components/ui/form/CheckboxChoiceCard'
import { RadioChoiceCard } from '@/components/ui/form/RadioChoiceCard'

/**
 * Selectable card for one option in a set (reference `.choice`). Wrap a set in `<Field group label="...">` (a fieldset
 * with a legend) plus a grid; each card names itself with its own label.
 *
 * `type="radio"`: a native radio (visually hidden, so the browser supplies grouping by `name`, arrow-key movement and
 * form posting); `type="checkbox"`: Radix Checkbox. The whole card is the label, so the hit area is the card (48px
 * minimum). Selected state is shown by a tick in the mark, a forest border and a copper edge bar: three cues, none of
 * them colour alone. Focus shows the global ring on the mark.
 */
export function ChoiceCard(props: ChoiceCardProps) {
  const { label, description, id, disabled, className } = props
  const generated = useId()
  const controlId = id ?? `choice-${generated.replace(/:/g, '')}`
  const descriptionId = `${controlId}-description`
  const hasDescription = description !== undefined && description !== null && description !== false

  const shared: ChoiceCardShared = {
    controlId,
    describedBy: hasDescription ? descriptionId : undefined,
    cardClass: cn(CARD_CLASS, disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className),
    edgeBar: (
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 hidden w-1 bg-copper group-has-checked:block group-has-data-[state=checked]:block"
      />
    ),
    text: (
      <span className="grid min-w-0 gap-1">
        <span className="text-body font-semibold wrap-break-word text-ink">{label}</span>
        {hasDescription ? (
          <span id={descriptionId} className="text-sm wrap-break-word text-muted">
            {description}
          </span>
        ) : null}
      </span>
    ),
  }

  return props.type === 'checkbox' ? (
    <CheckboxChoiceCard {...props} {...shared} />
  ) : (
    <RadioChoiceCard {...props} {...shared} />
  )
}
