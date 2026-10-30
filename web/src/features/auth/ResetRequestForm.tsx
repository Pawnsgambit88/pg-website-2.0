'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { Field } from '@/components/ui/form/Field'
import { FormErrorSummary, type FormErrorItem } from '@/components/ui/form/FormErrorSummary'
import { Input } from '@/components/ui/form/Input'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { describeWait, type ErrorCopy } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import { controlIdFor } from '@/lib/forms/ids'
import { applyServerFieldErrors } from '@/lib/forms/serverErrors'
import { useZodForm } from '@/lib/forms/useZodForm'
import { rateLimitSeconds } from '@/features/auth/login-flow'
import {
  RESET_REQUEST_FIELDS,
  isNeutralRequestAnswer,
  resetRequestErrorCopy,
  resetRequestFormSchema,
  type ResetRequestFormInput,
  type ResetRequestFormValues,
} from '@/features/auth/reset-flow'

const EMAIL_ID = controlIdFor('email')
const LOCK_REASON_ID = 'reset-request-locked-reason'
const SENT_HEADING_ID = 'reset-request-sent-heading'

/**
 * Screen 16, request mode (TASK-053). One email field. Every answer that is not a failure of the request itself (a known
 * email, an unknown one, a backend that says 404 for an unknown one) shows the SAME neutral confirmation, so the screen
 * never discloses whether an account exists. RATE_LIMITED (applied to unknown emails too) shows the wait and locks the
 * button for that long; network, timeout and 5xx keep the typed email and say a retry is safe (the request is idempotent
 * from the user's side: at worst a second email arrives). The confirmation takes focus so it is announced.
 */
export function ResetRequestForm() {
  const api = useApi()

  const form = useZodForm<ResetRequestFormInput, ResetRequestFormValues>(resetRequestFormSchema, {
    defaultValues: { email: '' },
    // The summary takes focus on a failed submit instead (it links to the field).
    shouldFocusError: false,
  })
  const { register, handleSubmit, setError, setFocus, formState } = form
  const { errors, isSubmitting } = formState

  const [sent, setSent] = useState(false)
  const [serverCopy, setServerCopy] = useState<ErrorCopy | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [lockSeconds, setLockSeconds] = useState<number | null>(null)
  const sentRef = useRef<HTMLDivElement>(null)

  // RATE_LIMITED: block the submit for the server's wait, then release it. One timer per lock.
  useEffect(() => {
    if (lockSeconds === null) return undefined
    const timer = window.setTimeout(() => setLockSeconds(null), lockSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [lockSeconds])

  // The confirmation replaces the form: move focus to it so it is read out and keyboard users are not left on nothing.
  useEffect(() => {
    if (sent) sentRef.current?.focus()
  }, [sent])

  const onValid = async (values: ResetRequestFormValues) => {
    setServerCopy(null)
    try {
      await api.player.auth.requestPasswordReset({ email: values.email })
      setSent(true)
    } catch (error) {
      if (isAbortError(error)) return
      if (isNeutralRequestAnswer(error)) {
        setSent(true)
        return
      }
      const { applied } = applyServerFieldErrors<ResetRequestFormInput>(error, setError, RESET_REQUEST_FIELDS)
      const copy = resetRequestErrorCopy(error)
      if (applied.length === 0 || copy.recovery !== 'fix-fields') setServerCopy(copy)
      const wait = rateLimitSeconds(error)
      if (wait !== undefined) setLockSeconds(wait)
      setFocusToken((token) => token + 1)
    }
  }

  const onInvalid = () => {
    setServerCopy(null)
    setFocusToken((token) => token + 1)
  }

  const locked = lockSeconds !== null

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // No double submit: Enter in the field while a request is running (or while locked) does nothing.
    if (isSubmitting || locked) {
      event.preventDefault()
      return
    }
    void handleSubmit(onValid, onInvalid)(event)
  }

  const startOver = () => {
    setSent(false)
    // After the form is back in the DOM.
    window.requestAnimationFrame(() => setFocus('email'))
  }

  if (sent) {
    return (
      <div className="grid min-w-0 gap-6">
        <div
          ref={sentRef}
          tabIndex={-1}
          role="status"
          aria-labelledby={SENT_HEADING_ID}
          className="grid min-w-0 gap-3 border border-l-4 border-line border-l-success bg-success/10 p-4 text-ink"
        >
          <Heading level={2} size="card" id={SENT_HEADING_ID}>
            Check your email
          </Heading>
          <Text>
            If an account exists for that email, we&apos;ve sent a link to choose a new password. It works once and
            expires soon. Nothing there? Check your spam folder.
          </Text>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-flow-col sm:justify-start">
          <Button href="/login" size="lg">
            Back to login
          </Button>
          <Button variant="secondary" size="lg" onClick={startOver}>
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  const summaryItems: FormErrorItem[] =
    errors.email?.message === undefined ? [] : [{ id: EMAIL_ID, message: errors.email.message, label: 'Email' }]

  return (
    <div className="grid min-w-0 gap-6">
      <form noValidate aria-label="Request a password reset link" onSubmit={onSubmit} className="grid min-w-0 gap-5">
        <FormErrorSummary
          errors={summaryItems}
          focusToken={focusToken}
          title={serverCopy?.title ?? 'Please fix the following'}
          message={serverCopy?.body}
        />

        <Field id={EMAIL_ID} label="Email" error={errors.email?.message} required>
          <Input preset="email" autoComplete="email" readOnly={isSubmitting} {...register('email')} />
        </Field>

        <div className="grid min-w-0 gap-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Sending the reset link"
            disabled={locked}
            aria-describedby={locked ? LOCK_REASON_ID : undefined}
          >
            Send reset link
          </Button>
          {locked ? (
            <p id={LOCK_REASON_ID} className="text-sm wrap-break-word text-ink-soft">
              Too many requests. You can try again in {describeWait(lockSeconds)}.
            </p>
          ) : null}
        </div>
      </form>

      <p className="text-sm wrap-break-word text-muted">
        <TextLink href="/login">Back to login</TextLink>
      </p>
    </div>
  )
}
