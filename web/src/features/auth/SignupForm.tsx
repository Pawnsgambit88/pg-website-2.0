'use client'

import type { Route } from 'next'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextLink } from '@/components/ui/TextLink'
import { Field } from '@/components/ui/form/Field'
import { FormErrorSummary, type FormErrorItem } from '@/components/ui/form/FormErrorSummary'
import { Input } from '@/components/ui/form/Input'
import { describeWait, type ErrorCopy } from '@/lib/api/error-copy'
import { isAbortError } from '@/lib/api/errors'
import { envPublic } from '@/lib/env/env.public'
import { controlIdFor } from '@/lib/forms/ids'
import { applyServerFieldErrors } from '@/lib/forms/serverErrors'
import { useZodForm } from '@/lib/forms/useZodForm'
import { safeReturnTo } from '@/components/ui/feedback/safeReturnTo'
import { loginDestination, rateLimitSeconds } from '@/features/auth/login-flow'
import {
  EMAIL_TAKEN_FIELD_MESSAGE,
  SIGNUP_FIELD_LABELS,
  SIGNUP_FIELDS,
  WEAK_PASSWORD_FIELD_MESSAGE,
  isEmailTaken,
  isWeakPassword,
  signupErrorCopy,
  signupFormSchema,
  type SignupFormInput,
  type SignupFormValues,
} from '@/features/auth/signup-flow'
import { SignupPasswordRules } from '@/features/auth/SignupPasswordRules'
import { useAuthActions } from '@/features/auth/useAuth'

// Same flag rule and build-time inlining as LoginForm.tsx (ARCH-001 12.6; RBP bundle-conditional): with the flag off the
// dynamic import is dead code and no Google chunk is built.
const GOOGLE_AUTH = process.env.NEXT_PUBLIC_GOOGLE_AUTH === 'true' && envPublic.GOOGLE_AUTH
const GoogleSignInButton = GOOGLE_AUTH
  ? dynamic(() => import('@/features/auth/GoogleSignInButton').then((module) => module.GoogleSignInButton))
  : null

interface SignupFormProps {
  /** Raw `?returnTo=` from the URL. Validated here with `safeReturnTo`; an unsafe value is dropped. */
  returnTo?: string
}

const NAME_ID = controlIdFor('name')
const EMAIL_ID = controlIdFor('email')
const PASSWORD_ID = controlIdFor('password')
const RULES_ID = 'signup-password-rules'
const LOCK_REASON_ID = 'signup-locked-reason'

/**
 * Screen 14 form island (TASK-051). Name, email and password from `RegisterInput` (city and phone are optional in the
 * contract and wait for the progressive profile; no rating or Elo questions). The password rules are listed before the
 * first submit and tick off live in a leaf (`SignupPasswordRules`), so typing re-renders nothing here. zod validation on
 * submit, a focusable error summary on every failed submit, field errors adjacent to their inputs.
 *
 * Server failures: VALIDATION_FAILED and WEAK_PASSWORD land on their fields; EMAIL_TAKEN is said plainly on the email
 * field with a link to log in instead (the register contract answers it on `fields.email`); RATE_LIMITED shows the wait
 * and locks the button for that long; network, timeout and 5xx say the details are kept. Every typed value survives an
 * error. On success the auth store is already signed in: a polite confirmation notice appears, the button stays busy
 * and the router moves to `loginDestination` (a new player goes to `/welcome?returnTo=<validated target>`).
 */
export function SignupForm({ returnTo }: SignupFormProps) {
  const router = useRouter()
  const { register: createAccount } = useAuthActions()
  const safeQueryReturnTo = safeReturnTo(returnTo)

  const form = useZodForm<SignupFormInput, SignupFormValues>(signupFormSchema, {
    defaultValues: { name: '', email: '', password: '' },
    // The summary takes focus on a failed submit instead (it links to each field).
    shouldFocusError: false,
  })
  const { register, handleSubmit, setError, control, formState } = form
  const { errors, isSubmitting } = formState

  const [serverCopy, setServerCopy] = useState<ErrorCopy | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [focusToken, setFocusToken] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [lockSeconds, setLockSeconds] = useState<number | null>(null)

  // RATE_LIMITED: block the submit for the server's wait, then release it. One timer per lock.
  useEffect(() => {
    if (lockSeconds === null) return undefined
    const timer = window.setTimeout(() => setLockSeconds(null), lockSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [lockSeconds])

  const onValid = async (values: SignupFormValues) => {
    setServerCopy(null)
    setEmailTaken(false)
    try {
      const { user, returnTo: intent } = await createAccount(values)
      setNavigating(true)
      router.replace(loginDestination(user, intent, safeQueryReturnTo) as Route)
    } catch (error) {
      if (isAbortError(error)) return
      const { applied } = applyServerFieldErrors<SignupFormInput>(error, setError, SIGNUP_FIELDS)
      const taken = isEmailTaken(error)
      if (taken && !applied.includes('email')) {
        setError('email', { type: 'server', message: EMAIL_TAKEN_FIELD_MESSAGE })
        applied.push('email')
      }
      if (isWeakPassword(error) && !applied.includes('password')) {
        setError('password', { type: 'server', message: WEAK_PASSWORD_FIELD_MESSAGE })
        applied.push('password')
      }
      setEmailTaken(taken)
      const copy = signupErrorCopy(error)
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

  const summaryItems: FormErrorItem[] = SIGNUP_FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message === undefined ? [] : [{ id: controlIdFor(name), message, label: SIGNUP_FIELD_LABELS[name] }]
  })

  const loginHref =
    safeQueryReturnTo === undefined ? '/login' : { pathname: '/login', query: { returnTo: safeQueryReturnTo } }

  // The server's EMAIL_TAKEN message stays on the field until the email is edited (re-validation clears it).
  const showLoginInstead = emailTaken && errors.email?.type === 'server'
  const emailError =
    errors.email?.message === undefined ? undefined : (
      <>
        {errors.email.message}
        {showLoginInstead ? (
          <>
            {' '}
            <TextLink href={loginHref} inline>
              Log in instead
            </TextLink>
          </>
        ) : null}
      </>
    )

  return (
    <div className="grid min-w-0 gap-6">
      {GoogleSignInButton === null ? null : (
        <>
          <GoogleSignInButton returnTo={safeQueryReturnTo} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="border-t border-line" />
            or
            <span className="border-t border-line" />
          </div>
        </>
      )}

      <form noValidate aria-label="Create an account with email" onSubmit={onSubmit} className="grid min-w-0 gap-5">
        <FormErrorSummary
          errors={summaryItems}
          focusToken={focusToken}
          title={serverCopy?.title ?? 'Please fix the following'}
          message={serverCopy?.body}
        />

        <Field id={NAME_ID} label="Name" error={errors.name?.message} required>
          <Input preset="name" autoComplete="name" readOnly={busy} {...register('name')} />
        </Field>

        <Field id={EMAIL_ID} label="Email" error={emailError} required>
          <Input preset="email" autoComplete="email" readOnly={busy} {...register('email')} />
        </Field>

        <Field id={PASSWORD_ID} label="Password" error={errors.password?.message} required>
          <Input
            preset="password-new"
            autoComplete="new-password"
            readOnly={busy}
            aria-describedby={RULES_ID}
            {...register('password')}
          />
        </Field>
        <SignupPasswordRules id={RULES_ID} control={control} />

        <div className="grid min-w-0 gap-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={busy}
            loadingLabel={navigating ? 'Account created, opening My PG' : 'Creating your account'}
            disabled={locked}
            aria-describedby={locked ? LOCK_REASON_ID : undefined}
          >
            Create account
          </Button>
          {locked ? (
            <p id={LOCK_REASON_ID} className="text-sm wrap-break-word text-ink-soft">
              Too many attempts. You can try again in {describeWait(lockSeconds)}.
            </p>
          ) : null}
          <div role="status" className="min-w-0 empty:hidden">
            {navigating ? (
              <p className="text-sm font-semibold wrap-break-word text-success-ink">
                Your account is ready. Opening My PG.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <p className="text-sm wrap-break-word text-muted">
        Already a member?{' '}
        <TextLink href={loginHref} inline>
          Log in
        </TextLink>
      </p>
    </div>
  )
}
