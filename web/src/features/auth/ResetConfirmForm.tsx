'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { TextLink } from '@/components/ui/TextLink'
import { Field } from '@/components/ui/form/Field'
import { FormErrorSummary, type FormErrorItem } from '@/components/ui/form/FormErrorSummary'
import { Input } from '@/components/ui/form/Input'
import { useToast } from '@/components/ui/feedback/useToast'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { copyFor, describeWait, type ErrorCopy } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import { controlIdFor } from '@/lib/forms/ids'
import { applyServerFieldErrors } from '@/lib/forms/serverErrors'
import { useZodForm } from '@/lib/forms/useZodForm'
import { rateLimitSeconds } from '@/features/auth/login-flow'
import {
  RESET_CONFIRM_FIELDS,
  RESET_CONFIRM_FIELD_LABELS,
  RESET_DONE_DESTINATION,
  RESET_DONE_MESSAGE,
  RESET_TOKEN_PARAM,
  WEAK_NEW_PASSWORD_MESSAGE,
  isResetTokenInvalid,
  isWeakNewPassword,
  resetConfirmErrorCopy,
  resetConfirmFormSchema,
  tokenFromSearch,
  urlWithoutToken,
  type ResetConfirmFormInput,
  type ResetConfirmFormValues,
} from '@/features/auth/reset-flow'
import { ResetPasswordRules } from '@/features/auth/ResetPasswordRules'
import { useAuthActions } from '@/features/auth/useAuth'

interface ResetConfirmFormProps {
  /**
   * The server saw a `?token=` that cannot be a real link (empty or over the contract's 512 characters), so the expired
   * state shows at once. The token VALUE is never passed from the server: it would end up in the RSC payload.
   */
  linkUnusable?: boolean
}

const NEW_PASSWORD_ID = controlIdFor('newPassword')
const CONFIRM_PASSWORD_ID = controlIdFor('confirmPassword')
const RULES_ID = 'reset-password-rules'
const LOCK_REASON_ID = 'reset-confirm-locked-reason'
const HEADING_ID = 'reset-confirm-heading'

const INVALID_COPY = copyFor({ code: 'RESET_TOKEN_INVALID' })

/**
 * Screen 16, confirm mode (TASK-053), reached from the email link `/reset-password?token=...`.
 *
 * Token handling: on mount the token is read from `window.location` ONCE into a ref (component memory only), and the
 * address bar is cleaned at once with `history.replaceState`, so the token does not stay in the URL, the history entry,
 * a bookmark, a screenshot or a later Referer (the route also sends `Referrer-Policy: no-referrer`). It is never logged,
 * rendered, put in an error or a toast, and is sent only in the `confirmPasswordReset` call. A failed confirm with
 * RESET_TOKEN_INVALID drops it.
 *
 * States: the form (new password + confirm, show/hide on both, the rules visible before submit, the confirm must match);
 * WEAK_PASSWORD on the new-password field; RATE_LIMITED with the wait and a locked button; network, timeout and 5xx in
 * the summary with the typed values kept (a retry is safe: the server sets the password once); RESET_TOKEN_INVALID (bad,
 * used or expired link) replaces the form with the expired state and a link to request a new email. On success every
 * session was revoked by the server, so this tab signs out locally too (and tells the other tabs), a success toast is
 * queued in the (auth) group's toast host, and the router replaces the URL with `/login?reset=done`.
 */
export function ResetConfirmForm({ linkUnusable = false }: ResetConfirmFormProps) {
  const router = useRouter()
  const api = useApi()
  const { logout } = useAuthActions()
  const toast = useToast()

  const tokenRef = useRef<string | null>(null)
  const tokenRead = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const form = useZodForm<ResetConfirmFormInput, ResetConfirmFormValues>(resetConfirmFormSchema, {
    defaultValues: { newPassword: '', confirmPassword: '' },
    // The summary takes focus on a failed submit instead (it links to each field).
    shouldFocusError: false,
  })
  const { register, handleSubmit, setError, control, formState } = form
  const { errors, isSubmitting } = formState

  const [invalid, setInvalid] = useState(linkUnusable)
  const [serverCopy, setServerCopy] = useState<ErrorCopy | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [lockSeconds, setLockSeconds] = useState<number | null>(null)

  // Read the token once and take it out of the address bar. The guard keeps the Strict Mode re-run (which would find the
  // already cleaned URL) from wiping the ref. Nothing here is logged.
  useEffect(() => {
    if (tokenRead.current) return
    tokenRead.current = true
    const { search, href } = window.location
    tokenRef.current = linkUnusable ? null : tokenFromSearch(search)
    if (new URLSearchParams(search).has(RESET_TOKEN_PARAM)) {
      window.history.replaceState(window.history.state, '', urlWithoutToken(href))
    }
  }, [linkUnusable])

  // RATE_LIMITED: block the submit for the server's wait, then release it. One timer per lock.
  useEffect(() => {
    if (lockSeconds === null) return undefined
    const timer = window.setTimeout(() => setLockSeconds(null), lockSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [lockSeconds])

  // The expired state replaces the form after a submit: move focus to its heading so it is read out.
  useEffect(() => {
    if (invalid && !linkUnusable) headingRef.current?.focus()
  }, [invalid, linkUnusable])

  const onValid = async (values: ResetConfirmFormValues) => {
    setServerCopy(null)
    const token = tokenRef.current
    if (token === null) {
      setInvalid(true)
      return
    }
    try {
      await api.player.auth.confirmPasswordReset({ token, newPassword: values.newPassword })
      tokenRef.current = null
      setNavigating(true)
      // The server revoked every session of the account: drop this tab's (and the other tabs') local session as well,
      // otherwise the Login page would see a stale signed-in state and redirect away. logout() never rejects.
      await logout()
      toast.success(RESET_DONE_MESSAGE)
      router.replace(RESET_DONE_DESTINATION as Route)
    } catch (error) {
      if (isAbortError(error)) return
      if (isResetTokenInvalid(error)) {
        tokenRef.current = null
        setInvalid(true)
        return
      }
      const { applied } = applyServerFieldErrors<ResetConfirmFormInput>(error, setError, RESET_CONFIRM_FIELDS)
      if (isWeakNewPassword(error) && !applied.includes('newPassword')) {
        setError('newPassword', { type: 'server', message: WEAK_NEW_PASSWORD_MESSAGE })
        applied.push('newPassword')
      }
      const copy = resetConfirmErrorCopy(error)
      if (applied.length === 0 || copy.recovery !== 'fix-fields') setServerCopy(copy)
      const wait = rateLimitSeconds(error)
      if (wait !== undefined) setLockSeconds(wait)
      setFocusToken((value) => value + 1)
    }
  }

  const onInvalid = () => {
    setServerCopy(null)
    setFocusToken((value) => value + 1)
  }

  const busy = isSubmitting || navigating
  const locked = lockSeconds !== null

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // No double submit: Enter in a field while a request is running (or while locked) does nothing.
    if (busy || locked) {
      event.preventDefault()
      return
    }
    void handleSubmit(onValid, onInvalid)(event)
  }

  if (invalid) {
    return (
      <div className="grid min-w-0 gap-8">
        <div className="grid min-w-0 gap-3">
          <Eyebrow>Reset password</Eyebrow>
          <h1 ref={headingRef} id={HEADING_ID} tabIndex={-1} className="font-display text-section wrap-break-word">
            {INVALID_COPY.title}.
          </h1>
          <Text>{INVALID_COPY.body} Links work once and only for a short time.</Text>
        </div>
        <div className="grid min-w-0 gap-4">
          <Button href="/reset-password" size="lg" fullWidth>
            {INVALID_COPY.recoveryLabel ?? 'Request a new link'}
          </Button>
          <p className="text-sm wrap-break-word text-muted">
            <TextLink href="/login">Back to login</TextLink>
          </p>
        </div>
      </div>
    )
  }

  const summaryItems: FormErrorItem[] = RESET_CONFIRM_FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message === undefined ? [] : [{ id: controlIdFor(name), message, label: RESET_CONFIRM_FIELD_LABELS[name] }]
  })

  return (
    <div className="grid min-w-0 gap-8">
      <div className="grid min-w-0 gap-3">
        <Eyebrow>Reset password</Eyebrow>
        <Heading level={1} size="section" id={HEADING_ID}>
          Choose a new password.
        </Heading>
        <Text>You&apos;ll use it the next time you log in. Every device signed in to My PG will be signed out.</Text>
      </div>

      <div className="grid min-w-0 gap-6">
        <form noValidate aria-labelledby={HEADING_ID} onSubmit={onSubmit} className="grid min-w-0 gap-5">
          <FormErrorSummary
            errors={summaryItems}
            focusToken={focusToken}
            title={serverCopy?.title ?? 'Please fix the following'}
            message={serverCopy?.body}
          />

          <Field id={NEW_PASSWORD_ID} label="New password" error={errors.newPassword?.message} required>
            <Input
              preset="password-new"
              autoComplete="new-password"
              readOnly={busy}
              aria-describedby={RULES_ID}
              {...register('newPassword')}
            />
          </Field>
          <ResetPasswordRules id={RULES_ID} control={control} />

          <Field id={CONFIRM_PASSWORD_ID} label="Confirm new password" error={errors.confirmPassword?.message} required>
            <Input preset="password-new" autoComplete="new-password" readOnly={busy} {...register('confirmPassword')} />
          </Field>

          <div className="grid min-w-0 gap-2">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={busy}
              loadingLabel={navigating ? 'Password changed, opening log in' : 'Saving your new password'}
              disabled={locked}
              aria-describedby={locked ? LOCK_REASON_ID : undefined}
            >
              Save new password
            </Button>
            {locked ? (
              <p id={LOCK_REASON_ID} className="text-sm wrap-break-word text-ink-soft">
                Too many attempts. You can try again in {describeWait(lockSeconds)}.
              </p>
            ) : null}
          </div>
        </form>

        <p className="text-sm wrap-break-word text-muted">
          <TextLink href="/login">Back to login</TextLink>
        </p>
      </div>
    </div>
  )
}
