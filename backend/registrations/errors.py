"""Errors owned by the registrations app (core/ is not edited from this slice)."""
from core.errors import ApiError


class PaymentUnavailable(ApiError):
    """Paid registration needs the Razorpay slice (slice 4). Until then order creation and verify answer this."""

    status_code = 503
    error_code = 'PAYMENT_UNAVAILABLE'
    default_detail = 'Online payment is not available yet. Your place is held until the timer ends.'
