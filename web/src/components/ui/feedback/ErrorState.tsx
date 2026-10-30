'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import type { HeadingLevel } from '@/components/ui/headingLevel'
import type { LinkHref } from '@/components/ui/linkHref'
import { Surface } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { copyFor, type CopyOptions, type RecoveryKind } from '@/lib/api/error-copy'
import { safeRequestId } from '@/lib/api/errors'

/** A plain copy object for failures that are not API errors (a chunk that did not load, an unsupported browser). */
export interface ErrorStateCopy {
  title: string
  body: string
  /** Label for the retry button. Default "Try again". */
  retryLabel?: string
}

interface ErrorStateProps {
  /** An `ApiError` (or anything `copyFor` accepts), or a plain copy object. Raw error text is never rendered. */
  error: unknown
  /** Verb phrase for the "We couldn't {action}" fallbacks ("load your events"). Developer-written, never user input. */
  action?: CopyOptions['action']
  /** Re-runs the failed request. The retry button shows only when this is set and retrying makes sense for the error. */
  onRetry?: () => void
  /** The retry is in flight: the button shows busy and ignores clicks. */
  retrying?: boolean
  /** Semantic level of the title. Default 3 (a section failed, the page still stands). */
  headingLevel?: HeadingLevel
  /** `section` panel (default) or `inline` text without a frame, for a card or a field group. */
  variant?: 'section' | 'inline'
  /** Extra controls after the built-in recovery action (a secondary link). */
  children?: ReactNode
  className?: string
}

function isCopyObject(value: unknown): value is ErrorStateCopy {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { title?: unknown; body?: unknown; code?: unknown; status?: unknown }
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    candidate.code === undefined &&
    candidate.status === undefined
  )
}

const LINK_FOR: Partial<Record<RecoveryKind, LinkHref>> = {
  'go-play': '/play',
  'go-my-events': '/app/events',
  'go-my-pg': '/app',
  'contact-desk': '/contact',
}

/** Retrying the same request helps only for these; a rate limit, a fixed refusal or another screen is the real fix. */
const RETRYABLE: ReadonlySet<RecoveryKind> = new Set<RecoveryKind>(['retry', 'refresh'])

function requestIdOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const { requestId } = error as { requestId?: unknown }
  return typeof requestId === 'string' ? safeRequestId(requestId) : undefined
}

/**
 * The failed state of a section or list (ARCH-001 11.7, DoD-S): says what failed and the smallest recovery step, from the
 * error-copy map, never from server text. Shows a retry button when `onRetry` is given and the error is retryable, a
 * link for navigation recoveries, and the request id in small mono so a player can quote it to support. `role="alert"`
 * announces the failure once when it appears; use it for a failure that replaces content, not for background refreshes
 * (those keep the stale data and announce through the live region). Client component because of the retry handler.
 */
export function ErrorState({
  error,
  action,
  onRetry,
  retrying = false,
  headingLevel = 3,
  variant = 'section',
  children,
  className,
}: ErrorStateProps) {
  const plain = isCopyObject(error)
  const copy = plain
    ? { title: error.title, body: error.body, recovery: 'retry' as RecoveryKind, recoveryLabel: error.retryLabel }
    : copyFor(error, action === undefined ? {} : { action })
  const requestId = plain ? undefined : requestIdOf(error)
  const retryable = onRetry !== undefined && RETRYABLE.has(copy.recovery)
  const href = LINK_FOR[copy.recovery]
  const showLink = !retryable && href !== undefined && copy.recoveryLabel !== undefined

  const content = (
    <div role="alert" className="flex flex-col items-start gap-3">
      <Heading level={headingLevel} size="card">
        {copy.title}
      </Heading>
      <Text className="max-w-prose">{copy.body}</Text>
      {requestId === undefined ? null : (
        <Text variant="small" className="font-mono">
          Reference: {requestId}
        </Text>
      )}
      {retryable || showLink || children !== undefined ? (
        <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          {retryable ? (
            <Button onClick={onRetry} loading={retrying} loadingLabel="Retrying">
              {copy.recoveryLabel ?? 'Try again'}
            </Button>
          ) : null}
          {showLink ? (
            <Button href={href} variant="secondary">
              {copy.recoveryLabel}
            </Button>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  )

  return variant === 'inline' ? (
    <div className={className}>{content}</div>
  ) : (
    <Surface padding="lg" className={className}>
      {content}
    </Surface>
  )
}
