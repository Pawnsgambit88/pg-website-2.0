"""DRF exception handler: every failure becomes the failure envelope with a stable error code.

Nothing here echoes request data. Unexpected exceptions are logged by class name and request id only (messages of
database errors can contain row values, so the text/trace is not logged outside DEBUG).
"""
import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions as drf
from rest_framework.response import Response

from . import errors

logger = logging.getLogger('pg.api')


def flatten_errors(detail, prefix=''):
    """DRF ValidationError detail -> { field: [message] } (nested keys joined with '.')."""
    fields = {}
    if isinstance(detail, dict):
        for key, value in detail.items():
            name = 'form' if key == 'non_field_errors' else key
            path = f'{prefix}.{name}' if prefix else str(name)
            fields.update(flatten_errors(value, path))
    elif isinstance(detail, (list, tuple)):
        messages = [str(item) for item in detail if not isinstance(item, (dict, list, tuple))]
        nested = [item for item in detail if isinstance(item, (dict, list, tuple))]
        if messages:
            fields[prefix or 'form'] = messages
        for index, item in enumerate(nested):
            fields.update(flatten_errors(item, f'{prefix}.{index}' if prefix else str(index)))
    else:
        fields[prefix or 'form'] = [str(detail)]
    return fields


def to_api_error(exc):
    if isinstance(exc, errors.ApiError):
        return exc
    if isinstance(exc, drf.ValidationError):
        return errors.ValidationFailed(fields=flatten_errors(exc.detail))
    if isinstance(exc, (drf.NotAuthenticated, drf.AuthenticationFailed)):
        return errors.AuthRequired()
    if isinstance(exc, (drf.PermissionDenied, DjangoPermissionDenied)):
        return errors.AdminRequired()
    if isinstance(exc, (drf.NotFound, Http404)):
        return errors.NotFound()
    if isinstance(exc, drf.Throttled):
        return errors.RateLimited(exc.wait or 1)
    if isinstance(exc, drf.MethodNotAllowed):
        return errors.MethodNotAllowed()
    if isinstance(exc, drf.ParseError):
        return errors.ValidationFailed(fields={'form': ['The request body could not be read.']})
    if isinstance(exc, drf.UnsupportedMediaType):
        return errors.UnsupportedMediaType()
    if isinstance(exc, drf.NotAcceptable):
        return errors.ValidationFailed(fields={'form': ['Not acceptable.']})
    return None


def api_exception_handler(exc, context):
    request = context.get('request')
    api_error = to_api_error(exc)
    if api_error is None:
        logger.error(
            'unhandled_exception request_id=%s type=%s',
            getattr(request, 'request_id', '-'),
            type(exc).__name__,
            exc_info=exc if settings.DEBUG else None,
        )
        api_error = errors.InternalError()

    headers = dict(api_error.headers)
    if api_error.status_code == 401:
        headers.setdefault('WWW-Authenticate', 'Bearer')
    if isinstance(exc, drf.MethodNotAllowed):
        allow = getattr(context.get('view'), 'allowed_methods', None)
        if allow:
            headers['Allow'] = ', '.join(allow)
    response = Response(
        {
            'code': api_error.error_code,
            'detail': str(api_error.detail),
            'fields': api_error.fields,
            'retry_after': api_error.retry_after,
            'reason': api_error.reason,
            'blockers': api_error.blockers,
        },
        status=api_error.status_code,
        headers=headers,
    )
    for name, path in api_error.delete_cookies:
        response.delete_cookie(name, path=path)
    return response
