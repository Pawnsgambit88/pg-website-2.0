import type { ReactNode, Ref } from 'react'

export interface ChoiceCardCommon {
  label: ReactNode
  /** Secondary line (price, rule, effect of choosing). Linked with `aria-describedby`. */
  description?: ReactNode
  name?: string
  value?: string
  id?: string
  disabled?: boolean
  onBlur?: () => void
  className?: string
}

export interface ChoiceCardRadioProps extends ChoiceCardCommon {
  type: 'radio'
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  ref?: Ref<HTMLInputElement>
}

export interface ChoiceCardCheckboxProps extends ChoiceCardCommon {
  type: 'checkbox'
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  ref?: Ref<HTMLButtonElement>
}

export type ChoiceCardProps = ChoiceCardRadioProps | ChoiceCardCheckboxProps

export const CARD_CLASS =
  'group relative flex min-h-control min-w-0 items-start gap-3 overflow-hidden rounded-public border border-muted bg-parchment-soft p-4 ' +
  'transition-[border-color] duration-control hover:border-ink has-checked:border-forest has-data-[state=checked]:border-forest'

export const MARK_CLASS =
  'mt-0.5 flex size-6 shrink-0 items-center justify-center border border-muted bg-field text-parchment ' +
  'data-[state=checked]:border-forest data-[state=checked]:bg-forest'

/** Pieces computed once by ChoiceCard and handed to the radio / checkbox variant. */
export interface ChoiceCardShared {
  controlId: string
  describedBy: string | undefined
  cardClass: string
  edgeBar: ReactNode
  text: ReactNode
}
