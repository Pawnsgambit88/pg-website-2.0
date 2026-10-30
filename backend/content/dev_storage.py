"""Local stand-in for the Supabase signed upload and public read endpoints (STORAGE_MODE=fake, DEBUG only).

Mounted by pgchess.urls only when settings.STORAGE_MODE == 'fake'. The signed token (django.core.signing, expires with
the upload) is the only credential for PUT; GET serves objects by validated key like a public bucket. These views
answer plain HTTP like Supabase does, not the API envelope.
"""
from django.conf import settings
from django.core import signing
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .storage import FAKE_SALT, KEY_RE, FakeStorage

_TYPES = {'jpg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'avif': 'image/avif'}


@csrf_exempt
@require_http_methods(['PUT'])
def upload(request, token):
    try:
        claim = signing.loads(token, salt=FAKE_SALT, max_age=settings.MEDIA_UPLOAD_TTL_SECONDS)
        key, content_type = claim['k'], claim['ct']
    except (signing.BadSignature, KeyError, TypeError):
        return JsonResponse({'error': 'invalid_token'}, status=403)
    if request.META.get('CONTENT_TYPE', '').split(';')[0].strip().lower() != content_type:
        return JsonResponse({'error': 'content_type_mismatch'}, status=415)
    storage = FakeStorage()
    if storage.exists(key):
        return JsonResponse({'error': 'exists'}, status=409)
    data = request.read(settings.MEDIA_MAX_BYTES + 1)  # request.read is not capped by DATA_UPLOAD_MAX_MEMORY_SIZE
    if len(data) > settings.MEDIA_MAX_BYTES:
        return JsonResponse({'error': 'too_large'}, status=413)
    storage.write(key, data, content_type)
    return JsonResponse({'Key': f'{settings.SUPABASE_MEDIA_BUCKET}/{key}'})


@require_http_methods(['GET', 'HEAD'])
def public(request, key):
    storage = FakeStorage()
    if not KEY_RE.match(key) or not storage.exists(key):
        return HttpResponse(status=404)
    response = HttpResponse(storage.read(key, settings.MEDIA_MAX_BYTES * 2),
                            content_type=_TYPES[key.rsplit('.', 1)[1]])
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    return response
