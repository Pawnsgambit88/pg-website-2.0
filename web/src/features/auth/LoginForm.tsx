'use client'

import type { Route } from 'next'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import {
  LOGIN_FIELD_LABELS,
  LOGIN_FIELDS,
  isCredentialsError,
  loginDestination,
  loginErrorCopy,
  loginFormSchema,
  rateLimitSeconds,
  type LoginFormInput,
  type LoginFormValues,
} from '@/features/auth/login-flow'
import { useAuthActions } from '@/features/auth/useAuth'

// NEXT_PUBLIC_GOOGLE_AUTH (ARCH-001 12.6). Same rule as lib/env/public-schema.ts (only the literal 'true' turns it on),
// read as the literal `process.env` expression so Next inlines it at build time: with the flag off the dynamic import is
// dead code and no Google chunk is built (RBP bundle-conditional; same approach as adapters/mock-switch.ts). envPublic
// still validates the value at startup.
const GOOGLE_AUTH = process.env.NEXT_PUBLIC_GOOGLE_AUTH === 'true' && envPublic.GOOGLE_AUTH
const GoogleSignInButton = GOOGLE_AUTH
  ? dynamic(() => import('@/features/auth/GoogleSignInButton').then((module) => module.GoogleSignInButton))
  : null

interface LoginFormProps {
  /** Raw `?returnTo=` from the URL. Validated here with `safeReturnTo`; an unsafe value is dropped. */
  returnTo?: string
}

const EMAIL_ID = controlIdFor('email')
const PASSWORD_ID = controlIdFor('password')
const LOCK_REASON_ID = 'login-locked-reason'

/**
 * Screen 13 form island (TASK-050). Email and password (uncontrolled `register`, so typing re-renders nothing above the
 * input), zod validation on submit, a focusable error summary on every failed submit with the field errors also adjacent
 * to their inputs. Server failures go through `loginErrorCopy`: INVALID_CREDENTIALS (and any answer that could reveal
 * whether the account exists) uses one neutral sentence; RATE_LIMITED shows the wait and locks the button for that long;
 * network, timeout and 5xx say the details are kept. The typed email always survives an error; after a wrong-password
 * answer only the password is cleared. On success the auth store is already signed in; the button stays busy while the
 * router moves to `loginDestination` (intent, then validated `?returnTo=`, then the role landing; `/welcome` first for
 * a player whose onboarding is not done).
 */
export function LoginForm({ returnTo }: LoginFormProps) {
  const router = useRouter()
  const { login } = useAuthActions()
  const safeQueryReturnTo = safeReturnTo(returnTo)

  const form = useZodForm<LoginFormInput, LoginFormValues>(loginFormSchema, {
    defaultValues: { email: '', password: '' },
    // The summary takes focus on a failed submit instead (it links to each field).
    shouldFocusError: false,
  })
  const { register, handleSubmit, setError, resetField, formState } = form
  const { errors, isSubmitting } = formState

  const [serverCopy, setServerCopy] = useState<ErrorCopy | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [lockSeconds, setLockSeconds] = useState<number | null>(null)

  // RATE_LIMITED: block the submit for the server's wait, then release it. One timer per lock.
  useEffect(() => {
    if (lockSeconds === null) return undefined
    const timer = window.setTimeout(() => setLockSeconds(null), lockSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [lockSeconds])

  const onValid = async (values: LoginFormValues) => {
    setServerCopy(null)
    try {
      const { user, returnTo: intent } = await login(values)
      setNavigating(true)
      router.replace(loginDestination(user, intent, safeQueryReturnTo) as Route)
    } catch (error) {
      if (isAbortError(error)) return
      const { applied } = applyServerFieldErrors<LoginFormInput>(error, setError, LOGIN_FIELDS)
      const copy = loginErrorCopy(error)
      if (applied.length === 0 || copy.recovery !== 'fix-fields') setServerCopy(copy)
      if (isCredentialsError(error)) resetField('password')
      const wait = rateLimitSeconds(error)
      if (wait !== undefined) setLockSeconds(wait)
      setFocusToken((token) => token + 1)
    }
  }

  const onInvalid = () => {
    setServerCopy(null)
    setFocusToken((token) => token + 1)
  }

  const summaryItems: FormErrorItem[] = LOGIN_FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message === undefined ? [] : [{ id: controlIdFor(name), message, label: LOGIN_FIELD_LABELS[name] }]
  })

  const busy = isSubmitting || navigating
  const locked = lockSeconds !== null
  const signupHref =
    safeQueryReturnTo === undefined
      ? { pathname: '/login', query: { mode: 'signup' } }
      : { pathname: '/login', query: { mode: 'signup', returnTo: safeQueryReturnTo } }

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

      <form
        noValidate
        aria-label="Log in with email"
        onSubmit={(event) => void handleSubmit(onValid, onInvalid)(event)}
        className="grid min-w-0 gap-5"
      >
        <FormErrorSummary
          errors={summaryItems}
          focusToken={focusToken}
          title={serverCopy?.title ?? 'Please fix the following'}
          message={serverCopy?.body}
        />

        <Field id={EMAIL_ID} label="Email" error={errors.email?.message} required>
          <Input preset="email" autoComplete="email" readOnly={busy} {...register('email')} />
        </Field>

        <Field id={PASSWORD_ID} label="Password" error={errors.password?.message} required>
          <Input preset="password-current" autoComplete="current-password" readOnly={busy} {...register('password')} />
        </Field>

        <div>
          <TextLink href="/reset-password">Forgot password?</TextLink>
        </div>

        <div className="grid min-w-0 gap-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={busy}
            loadingLabel={navigating ? 'Signed in, opening My PG' : 'Logging in'}
            disabled={locked}
            aria-describedby={locked ? LOCK_REASON_ID : undefined}
          >
            Log in
          </Button>
          {locked ? (
            <p id={LOCK_REASON_ID} className="text-sm wrap-break-word text-ink-soft">
              Too many attempts. You can try again in {describeWait(lockSeconds)}.
            </p>
          ) : null}
        </div>
      </form>

      <p className="text-sm wrap-break-word text-muted">
        New to PG?{' '}
        <TextLink href={signupHref} inline>
          Create an account
        </TextLink>
      </p>
    </div>
  )
}
