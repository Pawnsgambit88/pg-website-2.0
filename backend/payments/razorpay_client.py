"""Razorpay adapter. Every provider call and signature check goes through this module.

RAZORPAY_MODE='live' calls `settings.RAZORPAY_API_BASE` with `requests` (connect and read timeouts, no retries here,
never logs bodies or credentials). RAZORPAY_MODE='fake' (DEBUG only, enforced in settings) is an in-database stand-in
that mimics create-order, fetch-payment and refund with deterministic ids, signed with the same secrets.

Provider entities are returned as plain dicts shaped like Razorpay's (id, order_id, amount, currency, status, ...).
"""
from __future__ import annotations

import hashlib
import hmac
import logging

import requests
from django.conf import settings

logger = logging.getLogger('pg.payments')


class ProviderError(Exception):
    """Base. `code` is a short reason code safe to log."""
    code = 'PROVIDER_ERROR'

    def __init__(self, code=None):
        super().__init__(code or self.code)
        self.code = code or self.code


class ProviderUnavailable(ProviderError):
    """Timeout, connection failure or 5xx: retry later."""
    code = 'PROVIDER_UNAVAILABLE'


class ProviderRejected(ProviderError):
    """4xx: the provider refused or does not know the object."""
    code = 'PROVIDER_REJECTED'


def is_fake() -> bool:
    return settings.RAZORPAY_MODE == 'fake'


def key_id() -> str:
    return settings.RAZORPAY_KEY_ID


# ---------------------------------------------------------------- signatures (identical in both modes)

def _hmac_hex(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def checkout_signature(order_id: str, payment_id: str) -> str:
    """What Razorpay Checkout returns as razorpay_signature: HMAC_SHA256(key_secret, order_id|payment_id)."""
    return _hmac_hex(settings.RAZORPAY_KEY_SECRET, f'{order_id}|{payment_id}'.encode())


def verify_checkout_signature(order_id: str, payment_id: str, signature: str) -> bool:
    return _safe_equal(checkout_signature(order_id, payment_id), signature)


def webhook_signature(raw_body: bytes) -> str:
    return _hmac_hex(settings.RAZORPAY_WEBHOOK_SECRET, raw_body)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    return _safe_equal(webhook_signature(raw_body), signature)


def _safe_equal(expected: str, given) -> bool:
    if not isinstance(given, str):
        return False
    return hmac.compare_digest(expected.encode(), given.encode('utf-8', 'replace'))


# ---------------------------------------------------------------- public operations

def create_order(*, amount_paise: int, currency: str, receipt: str, notes: dict | None = None) -> dict:
    if is_fake():
        return _fake_create_order(amount_paise, currency, receipt, notes or {})
    return _call('POST', '/orders', {'amount': amount_paise, 'currency': currency, 'receipt': receipt,
                                     'notes': notes or {}})


def fetch_payment(payment_id: str) -> dict:
    if is_fake():
        return _fake_fetch_payment(payment_id)
    return _call('GET', f'/payments/{payment_id}')


def refund_payment(*, payment_id: str, amount_paise: int, reference: str, notes: dict | None = None) -> dict:
    """`reference` is our refund row id: it makes the fake provider deterministic and is sent as the Razorpay receipt."""
    if is_fake():
        return _fake_refund(payment_id, amount_paise, reference)
    return _call('POST', f'/payments/{payment_id}/refund',
                 {'amount': amount_paise, 'receipt': reference[:40], 'notes': notes or {}})


# ---------------------------------------------------------------- live

def _call(method: str, path: str, body: dict | None = None) -> dict:
    url = settings.RAZORPAY_API_BASE + path
    try:
        response = requests.request(
            method, url, json=body, auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=(settings.RAZORPAY_CONNECT_TIMEOUT, settings.RAZORPAY_READ_TIMEOUT))
    except requests.RequestException as exc:
        logger.warning('razorpay_call_failed method=%s path=%s reason=%s', method, _safe_path(path), type(exc).__name__)
        raise ProviderUnavailable('NETWORK') from None
    if response.status_code >= 500 or response.status_code == 429:
        logger.warning('razorpay_call_failed method=%s path=%s status=%s', method, _safe_path(path), response.status_code)
        raise ProviderUnavailable(f'HTTP_{response.status_code}')
    if response.status_code >= 400:
        logger.warning('razorpay_call_rejected method=%s path=%s status=%s', method, _safe_path(path), response.status_code)
        raise ProviderRejected(f'HTTP_{response.status_code}')
    try:
        data = response.json()
    except ValueError:
        raise ProviderUnavailable('BAD_JSON') from None
    if not isinstance(data, dict):
        raise ProviderUnavailable('BAD_JSON')
    return data


def _safe_path(path: str) -> str:
    return path.split('/')[1] if '/' in path else path


# ---------------------------------------------------------------- fake (DEBUG only)

def _fake_id(prefix: str, seed: str) -> str:
    return prefix + hashlib.sha256(seed.encode()).hexdigest()[:14]


def fake_order_id(receipt: str) -> str:
    return _fake_id('order_Fake', 'order|' + receipt)


def fake_payment_id(order_id: str) -> str:
    return _fake_id('pay_Fake', 'payment|' + order_id)


def _store():
    from .models import FakeProviderRecord
    return FakeProviderRecord


def _fake_create_order(amount_paise, currency, receipt, notes) -> dict:
    order_id = fake_order_id(receipt)
    record, _ = _store().objects.get_or_create(
        provider_id=order_id,
        defaults={'kind': 'order', 'data': {'id': order_id, 'entity': 'order', 'amount': amount_paise,
                                            'amount_paid': 0, 'currency': currency, 'receipt': receipt,
                                            'status': 'created', 'notes': notes}})
    return record.data


def fake_make_payment(order_id: str, *, amount_paise: int | None = None, currency: str | None = None,
                      status: str = 'captured') -> dict:
    """Used by `razorpay_fake_pay`: the customer 'paid' on Checkout. Returns the payment entity."""
    order = _store().objects.filter(kind='order', provider_id=order_id).first()
    if order is None:
        raise ProviderRejected('HTTP_400')
    payment_id = fake_payment_id(order_id)
    data = {'id': payment_id, 'entity': 'payment', 'order_id': order_id,
            'amount': order.data['amount'] if amount_paise is None else amount_paise,
            'currency': currency or order.data['currency'], 'status': status, 'method': 'upi',
            'amount_refunded': 0}
    record, created = _store().objects.get_or_create(provider_id=payment_id, defaults={'kind': 'payment', 'data': data})
    if not created:
        record.data = data
        record.save(update_fields=['data'])
    if status == 'captured':
        order.data = {**order.data, 'amount_paid': data['amount'], 'status': 'paid'}
        order.save(update_fields=['data'])
    return data


def _fake_fetch_payment(payment_id) -> dict:
    record = _store().objects.filter(kind='payment', provider_id=payment_id).first()
    if record is None:
        raise ProviderRejected('HTTP_400')
    return record.data


def _fake_refund(payment_id, amount_paise, reference) -> dict:
    record = _store().objects.select_for_update().filter(kind='payment', provider_id=payment_id).first() \
        if _in_atomic() else _store().objects.filter(kind='payment', provider_id=payment_id).first()
    if record is None:
        raise ProviderRejected('HTTP_400')
    refund_id = _fake_id('rfnd_Fake', 'refund|' + reference)
    existing = _store().objects.filter(kind='refund', provider_id=refund_id).first()
    if existing is not None:
        return existing.data
    payment = record.data
    if payment.get('status') != 'captured' or amount_paise > payment['amount'] - payment.get('amount_refunded', 0):
        raise ProviderRejected('HTTP_400')
    refund = {'id': refund_id, 'entity': 'refund', 'payment_id': payment_id, 'amount': amount_paise,
              'currency': payment['currency'], 'status': 'processed', 'receipt': reference[:40]}
    _store().objects.create(kind='refund', provider_id=refund_id, data=refund)
    refunded = payment.get('amount_refunded', 0) + amount_paise
    record.data = {**payment, 'amount_refunded': refunded,
                   'status': 'refunded' if refunded >= payment['amount'] else payment['status']}
    record.save(update_fields=['data'])
    return refund


def _in_atomic() -> bool:
    from django.db import connection
    return connection.in_atomic_block
