"""Unified response envelope (DEC-011): { success, message, data, error, meta }.

Envelope keys are snake_case; keys inside `data` are camelCase (serializers own that). 204/205 have no body.
"""
import uuid

from rest_framework.renderers import JSONRenderer

from .responses import now_iso


class EnvelopeRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        context = renderer_context or {}
        response = context.get('response')
        request = context.get('request')
        if response is None:
            return super().render(data, accepted_media_type, renderer_context)
        if response.status_code in (204, 205):
            return b''

        request_id = getattr(request, 'request_id', None) or str(uuid.uuid4())
        meta = {'request_id': request_id, 'timestamp': now_iso(), 'pagination': getattr(response, 'pagination', None)}
        if response.status_code >= 400:
            error = data if isinstance(data, dict) else {'code': 'INTERNAL_ERROR', 'detail': None}
            error_body = {
                'code': error.get('code'),
                'detail': error.get('detail'),
                'fields': error.get('fields'),
                'retry_after': error.get('retry_after'),
                'reason': error.get('reason'),
            }
            if error.get('blockers'):
                error_body['blockers'] = error['blockers']
            body = {
                'success': False,
                'message': None,
                'data': None,
                'error': error_body,
                'meta': meta,
            }
        else:
            body = {
                'success': True,
                'message': getattr(response, 'message', None),
                'data': data,
                'error': None,
                'meta': meta,
            }
        return super().render(body, accepted_media_type, renderer_context)
