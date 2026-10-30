'use client'

import { Check } from '@/components/ui/icons/Check'
import { cn } from '@/lib/cn'
import { MARK_CLASS, type ChoiceCardRadioProps, type ChoiceCardShared } from '@/components/ui/form/choiceCardShared'

export function RadioChoiceCard({
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
}: ChoiceCardRadioProps & ChoiceCardShared) {
  return (
    <label htmlFor={controlId} className={cardClass}>
      {edgeBar}
      <input
        ref={ref}
        id={controlId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        disabled={disabled}
        onBlur={onBlur}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          MARK_CLASS,
          'rounded-full peer-checked:border-forest peer-checked:bg-forest peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)',
        )}
      >
        <span className="hidden group-has-checked:inline-flex">
          <Check size="sm" />
        </span>
      </span>
      {text}
    </label>
  )
}
