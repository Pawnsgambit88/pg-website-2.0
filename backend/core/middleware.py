"""Request id, access log line, default cache policy. No PII, tokens or bodies are ever logged (contract 6.6)."""
import logging
import re
import time
import uuid

SAFE_REQUEST_ID = re.compile(r'^[A-Za-z0-9._:-]{1,128}$')
logger = logging.getLogger('pg.request')


class RequestIdMiddleware:
    """Outermost middleware: accepts a safe inbound X-Request-ID (Vercel proxy) or makes one; logs one line per request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        inbound = request.META.get('HTTP_X_REQUEST_ID', '')
        request.request_id = inbound if SAFE_REQUEST_ID.match(inbound) else str(uuid.uuid4())
        started = time.monotonic()
        response = self.get_response(request)
        response['X-Request-ID'] = request.request_id
        # API responses default to no-store; public read views set their own Cache-Control first (contract 2.12).
        if request.path.startswith('/api/') and not response.has_header('Cache-Control'):
            response['Cache-Control'] = 'no-store'
        actor = getattr(request, 'pg_actor', '-')  # set by accounts.authentication after a verified token
        logger.info(
            'request_id=%s method=%s path=%s status=%s latency_ms=%d actor=%s',
            request.request_id,
            request.method,
            request.path,  # path only; the query string is never logged
            response.status_code,
            int((time.monotonic() - started) * 1000),
            actor,
        )
        return response
