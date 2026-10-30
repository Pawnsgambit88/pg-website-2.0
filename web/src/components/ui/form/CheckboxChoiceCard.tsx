'use client'

import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from '@/components/ui/icons/Check'
import { cn } from '@/lib/cn'
import { MARK_CLASS, type ChoiceCardCheckboxProps, type ChoiceCardShared } from '@/components/ui/form/choiceCardShared'

export function CheckboxChoiceCard({
  ref,
  checked,
  defaultChecked,
  onCheckedChange,
  name,
  value,
  disabled,
  onBlur,
  controlId,
  describedBy,
  cardClass,
  edgeBar,
  text,
}: ChoiceCardCheckboxProps & ChoiceCardShared) {
  return (
    <label htmlFor={controlId} className={cardClass}>
      {edgeBar}
      <RadixCheckbox.Root
        ref={ref}
        id={controlId}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange ? (state) => onCheckedChange(state === true) : undefined}
        disabled={disabled}
        onBlur={onBlur}
        aria-describedby={describedBy}
        className={cn(MARK_CLASS, 'rounded-public')}
      >
        <RadixCheckbox.Indicator>
          <Check size="sm" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {text}
    </label>
  )
}
