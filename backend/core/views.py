from django.db import connection
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request

from .errors import InternalError, NotFound
from .exception_handler import api_exception_handler
from .renderers import EnvelopeRenderer
from .responses import now_iso, ok


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """Liveness plus a database ping. Booleans only: no versions, hosts or settings are exposed."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:
        raise InternalError('Service unavailable.') from None
    return ok({'status': 'ok', 'database': True, 'serverNow': now_iso()})


def _envelope_response(request, exc):
    drf_request = Request(request)
    response = api_exception_handler(exc, {'request': drf_request, 'view': None})
    response.accepted_renderer = EnvelopeRenderer()
    response.accepted_media_type = 'application/json'
    response.renderer_context = {'request': drf_request, 'response': response}
    response.render()
    return response


def not_found(request, exception=None):
    """handler404: unknown URLs also answer in the envelope."""
    return _envelope_response(request, NotFound())


def server_error(request):
    """handler500."""
    return _envelope_response(request, InternalError())
