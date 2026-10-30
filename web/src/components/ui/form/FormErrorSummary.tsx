'use client'

import { useEffect, useRef, type MouseEvent } from 'react'
import { cn } from '@/lib/cn'

export interface FormErrorItem {
  /** Control id the message belongs to (`controlIdFor(name)` for FormField controls). */
  id: string
  message: string
  /** Visible field label, so the link reads "Email: Enter a valid email" and not just the message. */
  label?: string
}

interface FormErrorSummaryProps {
  errors: readonly FormErrorItem[]
  /** Increment on every failed submit so the summary takes focus again even when the list is unchanged. */
  focusToken?: number
  title?: string
  /** Form-level message not tied to a field (service down, wrong password). Shown above the list. */
  message?: string
  className?: string
}

/**
 * Form-level error summary (ARCH-001 15, WCAG 3.3.1). Renders nothing unless there is something to say. `role="alert"`
 * announces it, it takes focus on a failed submit (`focusToken`), and each item is a link that moves focus to the
 * offending control (explicit `focus()` as well as `#id`, because a Radix Select trigger or a custom control is not
 * always reachable by hash alone). Field errors stay adjacent to their fields too.
 */
export function FormErrorSummary({
  errors,
  focusToken = 0,
  title = 'Please fix the following',
  message,
  className,
}: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasMessage = message !== undefined && message !== ''
  const hasContent = errors.length > 0 || hasMessage

  useEffect(() => {
    if (focusToken > 0 && hasContent) ref.current?.focus()
  }, [focusToken, hasContent])

  if (!hasContent) return null

  const goTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    target.focus()
    target.scrollIntoView({ block: 'center' })
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={cn('min-w-0 rounded-public border-2 border-danger bg-parchment-soft p-4', className)}
    >
      <p className="text-body font-semibold text-danger-ink">{title}</p>
      {hasMessage ? <p className="mt-1 text-sm wrap-break-word text-ink">{message}</p> : null}
      {errors.length > 0 ? (
        <ul className="mt-2 grid gap-1 pl-5 text-sm">
          {errors.map((item) => (
            <li key={item.id} className="list-disc wrap-break-word">
              <a
                href={`#${item.id}`}
                onClick={(event) => goTo(event, item.id)}
                className="tap inline-flex items-center text-danger-ink underline underline-offset-2"
              >
                {item.label !== undefined ? `${item.label}: ${item.message}` : item.message}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
