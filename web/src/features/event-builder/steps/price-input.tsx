'use client'

import { useState, type Ref } from 'react'
import { Input } from '@/components/ui/form/Input'
import { Text } from '@/components/ui/Text'
import { formatInr } from '@/lib/format/money'

const RUPEES = /^\d{1,7}(\.\d{1,2})?$/

function paiseToText(paise: number): string {
  if (!Number.isSafeInteger(paise)) return ''
  const rupees = Math.floor(paise / 100)
  const rest = paise % 100
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, '0')}`
}

/** Exact rupees text to paise by digit arithmetic (no float rounding). Null when not a valid amount. */
function textToPaise(text: string): number | null {
  const trimmed = text.trim()
  if (!RUPEES.test(trimmed)) return null
  const [whole = '0', fraction = ''] = trimmed.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

interface PriceInputProps {
  paise: number
  onChange: (next: number) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
  disabled: boolean
}

export function PriceInput({ paise, onChange, onBlur, name, ref, disabled }: PriceInputProps) {
  const [text, setText] = useState(() => paiseToText(paise))
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="text-body font-semibold text-ink">
          ₹
        </span>
        <Input
          ref={ref}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={text}
          onChange={(event) => {
            const next = event.target.value
            setText(next)
            // NaN fails the schema (z.int) so the field shows an error instead of sending a wrong amount.
            onChange(textToPaise(next) ?? Number.NaN)
          }}
          onBlur={onBlur}
        />
      </div>
      <Text variant="small" tone="muted">
        Shown to players as {Number.isFinite(paise) ? formatInr(paise) : 'an invalid amount'}.
      </Text>
    </div>
  )
}
