'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { ChoiceCard } from '@/components/ui/form/ChoiceCard'
import { Field } from '@/components/ui/form/Field'
import { FormErrorSummary, type FormErrorItem } from '@/components/ui/form/FormErrorSummary'
import { FormField } from '@/components/ui/form/FormField'
import { Input } from '@/components/ui/form/Input'
import { Textarea } from '@/components/ui/form/Textarea'
import { copyFor, describeWait, type ErrorCopy } from '@/lib/api/error-copy'
import { isAbortError, isApiError } from '@/lib/api/errors'
import { newIdempotencyKey } from '@/lib/api/idempotency'
import { CONTACT_TOPICS } from '@/lib/api/types/contact'
import type { IdempotencyKey } from '@/lib/api/types/primitives'
import { controlIdFor } from '@/lib/forms/ids'
import { applyServerFieldErrors } from '@/lib/forms/serverErrors'
import { useZodForm } from '@/lib/forms/useZodForm'
import {
  CONTACT_FIELDS,
  FIELD_LABEL,
  MESSAGE_MAX,
  TOPIC_LABEL,
  contactFormSchema,
  type ContactFormInput,
  type ContactFormValues,
} from '@/components/public/contact/contactForm.schema'
import { submitContact } from '@/components/public/contact/submitContact'

const SUCCESS_HEADING_ID = 'contact-success-heading'
const LOCK_REASON_ID = 'contact-locked-reason'
const HONEYPOT_ID = 'contact-website'
const ACTION = 'send your message'
/** Upper bound for the RATE_LIMITED lock, whatever the server says. */
const MAX_LOCK_SECONDS = 15 * 60

const DEFAULTS: ContactFormInput = { name: '', email: '', topic: 'joining_event', message: '', website: '' }

function rateLimitSeconds(error: unknown): number | undefined {
  if (!isApiError(error) || (error.code !== 'RATE_LIMITED' && error.code !== 'HTTP_429')) return undefined
  if (error.retryAfter === undefined || error.retryAfter <= 0) return undefined
  return Math.min(error.retryAfter, MAX_LOCK_SECONDS)
}

/**
 * Contact form island (screen 08, TASK-048, AC-26). The only client code on /contact.
 *
 * - Visible labels; errors next to each field and, on a failed submit, in a focused summary that links to the fields.
 * - Pending: the button shows a spinner and blocks activation, fields are read-only, and a second submit (tap or Enter)
 *   does nothing. One Idempotency-Key per intent: created on the first send, reused for every retry of the same
 *   message, replaced only after a success when the user starts a new message (ARCH-001 11.8).
 * - Success replaces the form with a focused, polite status.
 * - RATE_LIMITED: the wait is shown and the button is locked for that long.
 * - Service errors (network, timeout, 5xx): copy from the error map, the typed message is kept, the button retries.
 * - Honeypot `website`: visually hidden, `aria-hidden`, out of the tab order and autofill; a person leaves it empty.
 */
export function ContactForm() {
  const form = useZodForm<ContactFormInput, ContactFormValues>(contactFormSchema, {
    defaultValues: DEFAULTS,
    // The summary takes focus on a failed submit instead (it links to each field).
    shouldFocusError: false,
  })
  const { register, handleSubmit, setError, reset, setFocus, control, formState } = form
  const { errors, isSubmitting } = formState

  const [sent, setSent] = useState(false)
  const [serverCopy, setServerCopy] = useState<ErrorCopy | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [lockSeconds, setLockSeconds] = useState<number | null>(null)
  const keyRef = useRef<IdempotencyKey | null>(null)
  const inFlight = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Cancel a request still running when the island unmounts (navigation away).
  useEffect(() => () => abortRef.current?.abort(), [])

  // RATE_LIMITED: block the submit for the server's wait, then release it.
  useEffect(() => {
    if (lockSeconds === null) return undefined
    const timer = window.setTimeout(() => setLockSeconds(null), lockSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [lockSeconds])

  // The confirmation replaces the form: focus it so it is read out and keyboard users are not left on nothing.
  useEffect(() => {
    if (sent) successRef.current?.focus()
  }, [sent])

  const locked = lockSeconds !== null

  const onValid = async (values: ContactFormValues) => {
    if (inFlight.current) return
    inFlight.current = true
    setServerCopy(null)
    keyRef.current ??= newIdempotencyKey()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await submitContact(
        {
          name: values.name,
          email: values.email,
          topic: values.topic,
          message: values.message,
          website: values.website ?? '',
        },
        keyRef.current,
        controller.signal,
      )
      keyRef.current = null
      setSent(true)
    } catch (error) {
      if (isAbortError(error)) return
      const { applied } = applyServerFieldErrors<ContactFormInput>(error, setError, CONTACT_FIELDS)
      const copy = copyFor(error, { action: ACTION })
      if (applied.length === 0 || copy.recovery !== 'fix-fields') setServerCopy(copy)
      const wait = rateLimitSeconds(error)
      if (wait !== undefined) setLockSeconds(wait)
      setFocusToken((token) => token + 1)
    } finally {
      inFlight.current = false
      abortRef.current = null
    }
  }

  const onInvalid = () => {
    setServerCopy(null)
    setFocusToken((token) => token + 1)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isSubmitting || locked || inFlight.current) {
      event.preventDefault()
      return
    }
    void handleSubmit(onValid, onInvalid)(event)
  }

  const startOver = () => {
    reset(DEFAULTS)
    setServerCopy(null)
    setSent(false)
    // After the form is back in the DOM.
    window.requestAnimationFrame(() => setFocus('name'))
  }

  if (sent) {
    return (
      <div className="grid min-w-0 gap-6">
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          aria-labelledby={SUCCESS_HEADING_ID}
          className="grid min-w-0 gap-3 border border-l-4 border-line border-l-success bg-success/10 p-4 text-ink"
        >
          <Heading level={2} size="card" id={SUCCESS_HEADING_ID}>
            Message sent
          </Heading>
          <Text tone="inherit">
            Thanks for writing. A person from PG reads every message and will reply to the email you gave us.
          </Text>
        </div>
        <div>
          <Button variant="secondary" onClick={startOver}>
            Send another message
          </Button>
        </div>
      </div>
    )
  }

  const summaryItems: FormErrorItem[] = CONTACT_FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message === undefined ? [] : [{ id: controlIdFor(name), message, label: FIELD_LABEL[name] }]
  })
  const retrying = serverCopy !== null && serverCopy.recovery === 'retry'

  return (
    <form
      noValidate
      aria-label="Contact Pawn's Gambit"
      onSubmit={onSubmit}
      className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2"
    >
      <FormErrorSummary
        errors={summaryItems}
        focusToken={focusToken}
        title={serverCopy?.title ?? 'Please fix the following'}
        message={serverCopy?.body}
        className="sm:col-span-2"
      />

      <Field id={controlIdFor('name')} label={FIELD_LABEL.name} error={errors.name?.message} required>
        <Input preset="name" maxLength={80} readOnly={isSubmitting} {...register('name')} />
      </Field>

      <Field id={controlIdFor('email')} label={FIELD_LABEL.email} error={errors.email?.message} required>
        <Input preset="email" maxLength={254} readOnly={isSubmitting} {...register('email')} />
      </Field>

      <FormField control={control} name="topic" label={FIELD_LABEL.topic} group required className="sm:col-span-2">
        {(field, id) => (
          <div className="grid min-w-0 grid-cols-1 gap-3 xs:grid-cols-2">
            {CONTACT_TOPICS.map((topic, index) => (
              <ChoiceCard
                key={topic}
                type="radio"
                ref={index === 0 ? field.ref : undefined}
                id={index === 0 ? id : `${id}-${topic}`}
                name={field.name}
                value={topic}
                label={TOPIC_LABEL[topic]}
                checked={field.value === topic}
                onCheckedChange={(checked) => {
                  if (checked) field.onChange(topic)
                }}
                onBlur={field.onBlur}
                disabled={isSubmitting}
              />
            ))}
          </div>
        )}
      </FormField>

      <Field
        id={controlIdFor('message')}
        label={FIELD_LABEL.message}
        hint="Event, date or anything that helps us answer. Up to 2,000 characters."
        error={errors.message?.message}
        required
        className="sm:col-span-2"
      >
        <Textarea rows={7} maxLength={MESSAGE_MAX} readOnly={isSubmitting} {...register('message')} />
      </Field>

      {/* Honeypot: hidden from people and assistive tech, never focusable, never autofilled. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={HONEYPOT_ID}>Website</label>
        <input id={HONEYPOT_ID} type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div className="grid min-w-0 gap-2 sm:col-span-2 sm:justify-start">
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          loadingLabel="Sending your message"
          disabled={locked}
          aria-describedby={locked ? LOCK_REASON_ID : undefined}
          className="w-full sm:w-auto"
        >
          {retrying ? 'Try sending again' : 'Send message'}
        </Button>
        {locked ? (
          <p id={LOCK_REASON_ID} className="text-sm wrap-break-word text-ink-soft">
            Too many messages for now. You can send again in {describeWait(lockSeconds)}.
          </p>
        ) : null}
      </div>
    </form>
  )
}
