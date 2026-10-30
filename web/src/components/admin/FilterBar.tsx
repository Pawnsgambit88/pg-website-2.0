'use client'

import { useId, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'

export interface FilterBarProps {
  /** Accessible name of the search landmark ("Filter events"). */
  label: string
  /** Search box. Omit when the list has no text search. `onSearchChange` fires on every change: debounce in the caller. */
  search?: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string }
  /** Selects, segmented controls and so on, laid out in a wrapping row. */
  children?: ReactNode
  /** Number of filters currently applied; Reset shows only when above zero. */
  activeCount?: number
  onReset?: () => void
  /** Result summary ("12 events"), announced politely when it changes. */
  resultSummary?: string
}

/**
 * Filter row above an admin list (FE-14). A `search` landmark: text search plus any extra controls, a Reset action that
 * appears only while filters are applied, and a polite live result count. State lives in the caller (usually the URL), so
 * lists are shareable; this component holds none. Wraps at 320px, controls keep 44px+ targets.
 */
export function FilterBar({ label, search, children, activeCount = 0, onReset, resultSummary }: FilterBarProps) {
  const searchId = useId()
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault()
  }
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {search === undefined ? null : (
        <Field label={search.label ?? 'Search'} id={searchId} className="min-w-0 sm:flex-1">
          <Input
            type="search"
            value={search.value}
            placeholder={search.placeholder}
            onChange={(event) => {
              search.onChange(event.target.value)
            }}
          />
        </Field>
      )}
      {children}
      {onReset !== undefined && activeCount > 0 ? (
        <Button variant="secondary" onClick={onReset}>
          Reset filters
        </Button>
      ) : null}
      {resultSummary === undefined ? null : (
        <p role="status" className="text-label text-muted sm:basis-full">
          {resultSummary}
        </p>
      )}
    </form>
  )
}
