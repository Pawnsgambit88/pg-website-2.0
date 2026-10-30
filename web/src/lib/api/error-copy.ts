import { codeFromStatus } from '@/lib/api/errors'
import { isKnownErrorCode, type ErrorCode } from '@/lib/api/types/error-codes'

// Error code to humane copy (ARCH-001 11.7; TASK-014 draft table, wording pending product-manager approval).
// Every sentence names what failed and the smallest recovery step. The map is typed `Record<ErrorCode, ...>`, so adding a
// code to `error-codes.ts` is a compile error until it has copy (AC-85). Raw server text (`detail`, `message`) is NEVER
// shown: it can carry emails, ids or stack fragments (SEC-001 F-17). The single exception is `fieldErrorsFrom`, which
// returns per-field validation messages for form inputs only (length-capped, strings only).
// Placeholders: `{action}` (caller label, "register for this event") and `{retry_after}` (rendered as seconds/minutes).

export type RecoveryKind =
  | 'login'
  | 'retry'
  | 'go-back'
  | 'go-play'
  | 'go-my-events'
  | 'go-my-pg'
  | 'contact-desk'
  | 'refresh'
  | 'wait'
  | 'continue-payment'
  | 'fix-fields'
  | 'confirm-password'
  | 'none'

interface CopyEntry {
  title: string
  body: string
  recovery: RecoveryKind
  /** Label for the recovery control, when there is one. */
  recoveryLabel?: string
}

const RETRY_BODY = 'Your details are saved. Try again.'

const COPY: Readonly<Record<ErrorCode, CopyEntry>> = {
  // ----- Tier A: the 15 contract codes -----
  AUTH_REQUIRED: {
    title: 'Please log in to continue',
    body: "We'll bring you back here afterwards.",
    recovery: 'login',
    recoveryLabel: 'Log in',
  },
  ADMIN_REQUIRED: {
    title: 'This area is for PG admins only',
    body: 'Your account does not have admin access.',
    recovery: 'go-my-pg',
    recoveryLabel: 'Go to My PG',
  },
  EVENT_NOT_FOUND: {
    title: "We can't find that event",
    body: 'It may have moved or been removed.',
    recovery: 'go-play',
    recoveryLabel: 'See events',
  },
  REGISTRATION_NOT_OPEN: {
    title: "Registration hasn't opened yet",
    body: "Registration for this event hasn't opened yet. Check the opening date on the event page.",
    recovery: 'go-back',
    recoveryLabel: 'Back to the event',
  },
  REGISTRATION_CLOSED: {
    title: 'Registration has closed',
    body: 'Registration for this event has closed. Have a look at the next events.',
    recovery: 'go-play',
    recoveryLabel: 'See next events',
  },
  EVENT_FULL: {
    title: 'This event is full',
    body: 'Every place has been taken. Join the waitlist if it is open, or look at the next events.',
    recovery: 'go-play',
    recoveryLabel: 'See next events',
  },
  ALREADY_REGISTERED: {
    title: "You're already registered",
    body: "You're already registered for this event.",
    recovery: 'go-my-events',
    recoveryLabel: 'Go to My events',
  },
  PAYMENT_REQUIRED: {
    title: 'Payment needed',
    body: 'This event needs payment to confirm your place.',
    recovery: 'continue-payment',
    recoveryLabel: 'Continue to payment',
  },
  PAYMENT_MISMATCH: {
    title: "We couldn't match that payment",
    body: "We couldn't match that payment to your place. Nothing has been charged twice; we're checking.",
    recovery: 'contact-desk',
    recoveryLabel: 'Contact the event desk',
  },
  INVALID_SIGNATURE: {
    title: "We couldn't verify that payment",
    body: "We couldn't verify that payment. If you were charged, your place will confirm shortly.",
    recovery: 'refresh',
    recoveryLabel: 'Check my registration',
  },
  CHECKIN_WINDOW_CLOSED: {
    title: "Check-in isn't open right now",
    body: "Check-in isn't open right now. The event page shows when it opens.",
    recovery: 'refresh',
    recoveryLabel: 'Refresh',
  },
  REGISTRATION_NOT_CONFIRMED: {
    title: "Your place isn't confirmed yet",
    body: "Your place isn't confirmed yet, so you can't check in.",
    recovery: 'go-my-events',
    recoveryLabel: 'Go to My events',
  },
  ROUND_NOT_FOUND: {
    title: 'That round no longer exists',
    body: 'The rounds may have changed. Refresh to see the latest.',
    recovery: 'refresh',
    recoveryLabel: 'Refresh',
  },
  RESULTS_NOT_FINAL: {
    title: "This round can't be finalised yet",
    body: "Some results are still open, so this round can't be finalised.",
    recovery: 'refresh',
    recoveryLabel: 'Show open results',
  },
  ROUND_ALREADY_FINALIZED: {
    title: 'This round is already finalised',
    body: 'This round has already been finalised. Ratings were processed once.',
    recovery: 'refresh',
    recoveryLabel: 'Show the processed round',
  },

  // ----- Tier B: transport fallbacks owned by the frontend -----
  HTTP_400: {
    title: "We couldn't {action}",
    body: 'Some details need another look. Check the highlighted fields and try again.',
    recovery: 'fix-fields',
    recoveryLabel: 'Fix the details',
  },
  HTTP_401: {
    title: 'Please log in to continue',
    body: 'Your session has ended. Log in and we will bring you back here.',
    recovery: 'login',
    recoveryLabel: 'Log in',
  },
  HTTP_403: {
    title: "You don't have access to this",
    body: "Your account can't open this page.",
    recovery: 'go-back',
    recoveryLabel: 'Go back',
  },
  HTTP_404: {
    title: "We can't find that",
    body: 'It may have moved or been removed.',
    recovery: 'go-back',
    recoveryLabel: 'Go back',
  },
  HTTP_429: {
    title: 'Too many attempts',
    body: 'Too many attempts. Try again in {retry_after}.',
    recovery: 'wait',
    recoveryLabel: 'Try again later',
  },
  HTTP_5XX: {
    title: "We couldn't {action}",
    body: RETRY_BODY,
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  NETWORK: {
    title: "We couldn't {action}",
    body: 'Check your connection, then try again. Your details are saved.',
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  TIMEOUT: {
    title: "We couldn't {action}",
    body: 'That took too long. Your details are saved; try again.',
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  BAD_RESPONSE: {
    title: 'Something unexpected came back',
    body: 'Please try again. If it keeps happening, tell us the reference shown in Details.',
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  MOCK_SERVER_MUTATION: {
    title: "We couldn't {action}",
    body: 'This action is not available in this build.',
    recovery: 'none',
  },

  // ----- Tier C: inferred additions, pending ratification (contract 2.2) -----
  VALIDATION_FAILED: {
    title: 'Some details need fixing',
    body: 'Check the highlighted fields and try again.',
    recovery: 'fix-fields',
    recoveryLabel: 'Fix the details',
  },
  RATE_LIMITED: {
    title: 'Too many attempts',
    body: 'Too many attempts. Try again in {retry_after}.',
    recovery: 'wait',
    recoveryLabel: 'Try again later',
  },
  INVALID_CREDENTIALS: {
    title: "That email and password don't match",
    body: 'Check them and try again, or reset your password.',
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  EMAIL_TAKEN: {
    title: 'That email is already in use',
    body: 'Log in instead, or sign up with a different email.',
    recovery: 'login',
    recoveryLabel: 'Log in',
  },
  WEAK_PASSWORD: {
    title: 'Choose a stronger password',
    body: 'That password is too easy to guess. Use at least 8 characters, avoid common passwords and don’t reuse your email.',
    recovery: 'fix-fields',
    recoveryLabel: 'Change password',
  },
  RESET_TOKEN_INVALID: {
    title: 'That reset link has expired',
    body: 'The link has expired or was already used. Ask for a new one.',
    recovery: 'retry',
    recoveryLabel: 'Request a new link',
  },
  HOLD_EXPIRED: {
    title: 'Your hold on this place has expired',
    body: "Start again to reserve a place. If you've already paid, contact the event desk.",
    recovery: 'go-back',
    recoveryLabel: 'Start again',
  },
  SLUG_TAKEN: {
    title: 'That web address is already used',
    body: 'Pick a different one and try again.',
    recovery: 'fix-fields',
    recoveryLabel: 'Change the address',
  },
  SLUG_LOCKED: {
    title: "The web address can't change now",
    body: 'Once an event or story is published, its web address stays the same.',
    recovery: 'none',
  },
  VERSION_CONFLICT: {
    title: 'Someone else changed this first',
    body: 'Reload to see the latest version, then apply your edit again.',
    recovery: 'refresh',
    recoveryLabel: 'Reload',
  },
  NOT_PUBLISHABLE: {
    title: "This isn't ready to publish",
    body: 'Fix the items listed, then try again.',
    recovery: 'fix-fields',
    recoveryLabel: 'See what is missing',
  },
  ASSET_IN_USE: {
    title: 'This image is still in use',
    body: 'Archive it instead, or remove it from where it is used first.',
    recovery: 'none',
  },
  NOT_FOUND: {
    title: "We can't find that",
    body: 'It may have moved or been removed.',
    recovery: 'go-back',
    recoveryLabel: 'Go back',
  },
  IDEMPOTENCY_CONFLICT: {
    title: 'That was already sent with different details',
    body: 'Start again to send it fresh.',
    recovery: 'retry',
    recoveryLabel: 'Start again',
  },
  RESULT_NOT_ALLOWED: {
    title: "You can't enter this result right now",
    body: 'Ask the host if you think this is wrong.',
    recovery: 'refresh',
    recoveryLabel: 'Refresh',
  },
  CANCELLATION_NOT_ALLOWED: {
    title: "This registration can't be cancelled now",
    body: "It's outside the cancellation policy. Contact the event desk if you need help.",
    recovery: 'contact-desk',
    recoveryLabel: 'Contact the event desk',
  },
  STEP_UP_REQUIRED: {
    title: 'Please confirm your password',
    body: "This action needs you to confirm it's you.",
    recovery: 'confirm-password',
    recoveryLabel: 'Confirm password',
  },
  SIGNUP_CLOSED: {
    title: 'Sign-ups are closed for now',
    body: 'We are not creating new accounts at the moment. Please check back soon.',
    recovery: 'none',
  },
  METHOD_NOT_ALLOWED: {
    title: "We couldn't complete that request",
    body: 'Something went wrong on our side. Refresh the page and try again.',
    recovery: 'refresh',
    recoveryLabel: 'Refresh',
  },
  UNSUPPORTED_MEDIA_TYPE: {
    title: "We couldn't complete that request",
    body: 'Something went wrong on our side. Refresh the page and try again.',
    recovery: 'refresh',
    recoveryLabel: 'Refresh',
  },
  STORAGE_UNAVAILABLE: {
    title: 'Uploads are unavailable right now',
    body: 'Image storage is not responding. Try again in a few minutes.',
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  INTERNAL_ERROR: {
    title: 'Something went wrong on our side',
    body: RETRY_BODY,
    recovery: 'retry',
    recoveryLabel: 'Try again',
  },
  PAYMENT_UNAVAILABLE: {
    title: 'Payments are unavailable right now',
    body: "Your place isn't charged. Try again in a few minutes or contact the event desk.",
    recovery: 'contact-desk',
    recoveryLabel: 'Contact the event desk',
  },
}

export interface ErrorCopy {
  title: string
  body: string
  recovery: RecoveryKind
  recoveryLabel: string | undefined
}

export interface CopyOptions {
  /**
   * What the user was trying to do, as a verb phrase: "register for this event", "load your events". Developer-written,
   * never user input or server text. Fills `{action}` in the "We couldn't {action}" fallbacks.
   */
  action?: string
}

/** The minimal shape `copyFor` needs. `ApiError` and `TokenError` both satisfy it; a thrown non-error does not matter. */
export interface ErrorLike {
  code?: unknown
  status?: unknown
  retryAfter?: unknown
}

const DEFAULT_ACTION = 'finish that'
const MAX_ACTION_LENGTH = 80

function cleanAction(action: string | undefined): string {
  if (action === undefined) return DEFAULT_ACTION
  const cleaned = action
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?:;,]+$/, '')
    .slice(0, MAX_ACTION_LENGTH)
  return cleaned === '' ? DEFAULT_ACTION : cleaned
}

/** `{retry_after}` text: "12 seconds", "1 minute". Unknown wait gives "a moment". */
export function describeWait(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return 'a moment'
  const whole = Math.ceil(seconds)
  if (whole < 60) return whole === 1 ? '1 second' : `${String(whole)} seconds`
  const minutes = Math.ceil(whole / 60)
  return minutes === 1 ? '1 minute' : `${String(minutes)} minutes`
}

/** Unknown codes use the HTTP-status copy when the status is known, else the 5xx/NETWORK pattern (ARCH-001 11.7). */
function resolveCode(error: ErrorLike): ErrorCode {
  if (typeof error.code === 'string' && isKnownErrorCode(error.code)) return error.code
  if (typeof error.status === 'number' && error.status > 0) return codeFromStatus(error.status)
  return 'HTTP_5XX'
}

function fill(template: string, action: string, wait: string): string {
  return template.replaceAll('{action}', action).replaceAll('{retry_after}', wait)
}

export function copyFor(error: unknown, options: CopyOptions = {}): ErrorCopy {
  const like: ErrorLike = typeof error === 'object' && error !== null ? (error as ErrorLike) : {}
  const entry = COPY[resolveCode(like)]
  const action = cleanAction(options.action)
  const wait = describeWait(typeof like.retryAfter === 'number' ? like.retryAfter : undefined)
  return {
    title: fill(entry.title, action, wait),
    body: fill(entry.body, action, wait),
    recovery: entry.recovery,
    recoveryLabel: entry.recoveryLabel,
  }
}

/** Every code with copy. The completeness test compares this with `ALL_ERROR_CODES`. */
export const COPY_CODES: readonly ErrorCode[] = Object.keys(COPY) as ErrorCode[]

// ---------- field messages for forms ----------

const MAX_FIELD_MESSAGE = 200
const MAX_FIELD_MESSAGES = 5

/**
 * Per-field validation messages from `ApiError.fields`, for `useZodForm.setServerErrors` only. Strings are clipped and the
 * list is bounded. Use `copyFor` for anything that is not an input-level message.
 */
export function fieldErrorsFrom(error: unknown): Record<string, string[]> {
  const fields = typeof error === 'object' && error !== null ? (error as { fields?: unknown }).fields : undefined
  if (typeof fields !== 'object' || fields === null) return {}
  const result: Record<string, string[]> = {}
  for (const [name, messages] of Object.entries(fields)) {
    if (!Array.isArray(messages)) continue
    const clean = messages
      .filter((message): message is string => typeof message === 'string' && message.trim() !== '')
      .slice(0, MAX_FIELD_MESSAGES)
      .map((message) => message.trim().slice(0, MAX_FIELD_MESSAGE))
    if (clean.length > 0) result[name] = clean
  }
  return result
}
