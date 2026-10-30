"""Stable API error taxonomy (ARCH-001 contract 2.2, tiers A and C).

Raise an ApiError subclass anywhere in a view; core.exception_handler turns it into the failure envelope. The
`detail` strings are fixed, generic and user-safe: never put a submitted value, email, token or id in them.
Tier B codes (HTTP_xxx, NETWORK, ...) are frontend-originated and must never be emitted here.
"""
from rest_framework.exceptions import APIException


class ApiError(APIException):
    status_code = 400
    error_code = 'VALIDATION_FAILED'
    default_detail = 'The request could not be processed.'

    def __init__(self, detail=None, *, fields=None, retry_after=None, reason=None, headers=None, delete_cookies=None,
                 blockers=None):
        super().__init__(detail if detail is not None else self.default_detail, self.error_code)
        self.fields = fields
        # NOT_PUBLISHABLE only: [{code, reason, field?}] (additive envelope key; absent otherwise).
        self.blockers = blockers
        self.retry_after = retry_after
        self.reason = reason
        self.headers = headers or {}
        # (name, path) cookies the exception handler expires on the error response.
        self.delete_cookies = delete_cookies or []


# ---- Tier A ----
class AuthRequired(ApiError):
    status_code = 401
    error_code = 'AUTH_REQUIRED'
    default_detail = 'Authentication is required.'


class AdminRequired(ApiError):
    status_code = 403
    error_code = 'ADMIN_REQUIRED'
    default_detail = 'You do not have permission to do this.'


class EventNotFound(ApiError):
    status_code = 404
    error_code = 'EVENT_NOT_FOUND'
    default_detail = 'Event not found.'


class RegistrationNotOpen(ApiError):
    status_code = 409
    error_code = 'REGISTRATION_NOT_OPEN'
    default_detail = 'Registration is not open yet.'


class RegistrationClosed(ApiError):
    status_code = 409
    error_code = 'REGISTRATION_CLOSED'
    default_detail = 'Registration is closed.'


class EventFull(ApiError):
    status_code = 409
    error_code = 'EVENT_FULL'
    default_detail = 'This event is full.'


class AlreadyRegistered(ApiError):
    status_code = 409
    error_code = 'ALREADY_REGISTERED'
    default_detail = 'You are already registered.'


class PaymentRequired(ApiError):
    status_code = 402
    error_code = 'PAYMENT_REQUIRED'
    default_detail = 'A paid, confirmed registration is required.'


class PaymentMismatch(ApiError):
    status_code = 409
    error_code = 'PAYMENT_MISMATCH'
    default_detail = 'The payment does not match the order.'


class InvalidSignature(ApiError):
    status_code = 400
    error_code = 'INVALID_SIGNATURE'
    default_detail = 'The signature is invalid.'


class CheckinWindowClosed(ApiError):
    status_code = 409
    error_code = 'CHECKIN_WINDOW_CLOSED'
    default_detail = 'Check-in is not open.'


class RegistrationNotConfirmed(ApiError):
    status_code = 409
    error_code = 'REGISTRATION_NOT_CONFIRMED'
    default_detail = 'No confirmed registration.'


class RoundNotFound(ApiError):
    status_code = 404
    error_code = 'ROUND_NOT_FOUND'
    default_detail = 'Round not found.'


class ResultsNotFinal(ApiError):
    status_code = 409
    error_code = 'RESULTS_NOT_FINAL'
    default_detail = 'Results are not final.'


class RoundAlreadyFinalized(ApiError):
    status_code = 409
    error_code = 'ROUND_ALREADY_FINALIZED'
    default_detail = 'This round is already finalised.'


# ---- Tier C ----
class ValidationFailed(ApiError):
    status_code = 400
    error_code = 'VALIDATION_FAILED'
    default_detail = 'Some fields need attention.'


class RateLimited(ApiError):
    status_code = 429
    error_code = 'RATE_LIMITED'
    default_detail = 'Too many requests. Try again later.'

    def __init__(self, retry_after, **kwargs):
        retry_after = max(1, int(retry_after))
        headers = dict(kwargs.pop('headers', None) or {})
        headers['Retry-After'] = str(retry_after)
        super().__init__(retry_after=retry_after, headers=headers, **kwargs)


class InvalidCredentials(ApiError):
    status_code = 401
    error_code = 'INVALID_CREDENTIALS'
    default_detail = 'The email or password is incorrect.'


class EmailTaken(ApiError):
    status_code = 409
    error_code = 'EMAIL_TAKEN'
    default_detail = 'An account with this email already exists.'


class WeakPassword(ApiError):
    status_code = 400
    error_code = 'WEAK_PASSWORD'
    default_detail = 'Choose a less common password.'


class ResetTokenInvalid(ApiError):
    status_code = 400
    error_code = 'RESET_TOKEN_INVALID'
    default_detail = 'This reset link is invalid or has expired.'


class HoldExpired(ApiError):
    status_code = 409
    error_code = 'HOLD_EXPIRED'
    default_detail = 'The hold has expired.'


class SlugTaken(ApiError):
    status_code = 409
    error_code = 'SLUG_TAKEN'
    default_detail = 'This slug is already in use.'


class SlugLocked(ApiError):
    status_code = 409
    error_code = 'SLUG_LOCKED'
    default_detail = 'The slug cannot change after publishing.'


class VersionConflict(ApiError):
    status_code = 409
    error_code = 'VERSION_CONFLICT'
    default_detail = 'This item was changed by someone else.'


class NotPublishable(ApiError):
    status_code = 422
    error_code = 'NOT_PUBLISHABLE'
    default_detail = 'This item cannot be published yet.'


class AssetInUse(ApiError):
    status_code = 409
    error_code = 'ASSET_IN_USE'
    default_detail = 'This asset is still in use.'


class NotFound(ApiError):
    status_code = 404
    error_code = 'NOT_FOUND'
    default_detail = 'Not found.'


class IdempotencyConflict(ApiError):
    status_code = 422
    error_code = 'IDEMPOTENCY_CONFLICT'
    default_detail = 'This idempotency key was already used for a different request.'


class ResultNotAllowed(ApiError):
    status_code = 403
    error_code = 'RESULT_NOT_ALLOWED'
    default_detail = 'You cannot do this to the result right now.'


class CancellationNotAllowed(ApiError):
    status_code = 409
    error_code = 'CANCELLATION_NOT_ALLOWED'
    default_detail = 'Cancellation is not allowed.'


class StepUpRequired(ApiError):
    status_code = 401
    error_code = 'STEP_UP_REQUIRED'
    default_detail = 'Confirm your password to continue.'


# ---- Outside the frontend taxonomy (the frontend falls back to HTTP-status copy; never reuse a tier B name) ----
class SignupClosed(ApiError):
    status_code = 403
    error_code = 'SIGNUP_CLOSED'
    default_detail = 'New sign-ups are closed right now.'


class MethodNotAllowed(ApiError):
    status_code = 405
    error_code = 'METHOD_NOT_ALLOWED'
    default_detail = 'Method not allowed.'


class UnsupportedMediaType(ApiError):
    status_code = 415
    error_code = 'UNSUPPORTED_MEDIA_TYPE'
    default_detail = 'Unsupported content type.'


class StorageUnavailable(ApiError):
    status_code = 503
    error_code = 'STORAGE_UNAVAILABLE'
    default_detail = 'Media storage is unavailable. Try again shortly.'


class InternalError(ApiError):
    status_code = 500
    error_code = 'INTERNAL_ERROR'
    default_detail = 'Something went wrong on our side.'


TIER_A_CODES = (
    'AUTH_REQUIRED', 'ADMIN_REQUIRED', 'EVENT_NOT_FOUND', 'REGISTRATION_NOT_OPEN', 'REGISTRATION_CLOSED', 'EVENT_FULL',
    'ALREADY_REGISTERED', 'PAYMENT_REQUIRED', 'PAYMENT_MISMATCH', 'INVALID_SIGNATURE', 'CHECKIN_WINDOW_CLOSED',
    'REGISTRATION_NOT_CONFIRMED', 'ROUND_NOT_FOUND', 'RESULTS_NOT_FINAL', 'ROUND_ALREADY_FINALIZED',
)
TIER_C_CODES = (
    'VALIDATION_FAILED', 'RATE_LIMITED', 'INVALID_CREDENTIALS', 'EMAIL_TAKEN', 'WEAK_PASSWORD', 'RESET_TOKEN_INVALID',
    'HOLD_EXPIRED', 'SLUG_TAKEN', 'SLUG_LOCKED', 'VERSION_CONFLICT', 'NOT_PUBLISHABLE', 'ASSET_IN_USE', 'NOT_FOUND',
    'IDEMPOTENCY_CONFLICT', 'RESULT_NOT_ALLOWED', 'CANCELLATION_NOT_ALLOWED', 'STEP_UP_REQUIRED',
)

AUTH_FAILURE_REASONS = ('REFRESH_REUSED', 'SESSION_EXPIRED', 'ROLE_CHANGED', 'ACCOUNT_SUSPENDED')
