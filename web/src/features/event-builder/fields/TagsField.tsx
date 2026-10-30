'use client'

import { useRef } from 'react'
import { Input } from '@/components/ui/form/Input'

// Public tags chip-input (screen 39, EV-09). Stores tags in the RHF form only.
// Not sent to the backend (patch.ts filters it out); noted as backend gap (PLAN-003 Q3).

interface TagsFieldProps {
  tags: string[]
  onChange: (next: string[]) => void
  id: string
}

export function TagsField({ tags, onChange, id }: TagsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string): void {
    const tag = raw.trim().slice(0, 60)
    if (tag === '' || tags.includes(tag) || tags.length >= 20) return
    onChange([...tags, tag])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeTag(index: number): void {
    onChange(tags.filter((_, i) => i !== index))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    const input = event.target as HTMLInputElement
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(input.value)
    } else if (event.key === 'Backspace' && input.value === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>): void {
    const value = event.target.value
    if (value.trim() !== '') addTag(value)
  }

  return (
    <div className="grid min-w-0 gap-2">
      {tags.length > 0 ? (
        <ul aria-label="Added tags" className="flex min-w-0 flex-wrap gap-2">
          {tags.map((tag, index) => (
            <li
              key={tag}
              className="flex items-center gap-1 rounded-full border border-muted bg-parchment-soft px-3 py-1 font-ui text-sm text-ink"
            >
              <span>{tag}</span>
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                className="flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)"
                onClick={() => removeTag(index)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        ref={inputRef}
        id={`${id}-input`}
        name={id}
        placeholder="Type a tag and press Enter or comma"
        maxLength={60}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  )
}
