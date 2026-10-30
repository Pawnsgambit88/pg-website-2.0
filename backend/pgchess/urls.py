from django.conf import settings
from django.urls import include, path, re_path

from core import views as core_views

urlpatterns = [
    path('api/', include('core.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/me/', include('accounts.me_urls')),
    path('api/', include('content.urls')),
    path('api/', include('registrations.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('ratings.urls')),
    path('api/admin/', include('adminapi.urls')),
]

if settings.STORAGE_MODE == 'fake':  # local stand-in for Supabase Storage uploads/reads (DEBUG only, see settings)
    from content import dev_storage
    urlpatterns += [
        path('api/dev-storage/upload/<str:token>', dev_storage.upload, name='dev-storage-upload'),
        re_path(r'^api/dev-storage/public/(?P<key>media/[0-9a-f]{32}\.(?:jpg|png|webp|avif))$', dev_storage.public,
                name='dev-storage-public'),
    ]

# Any other /api/ path answers in the envelope (also under DEBUG, where Django would show an HTML page).
urlpatterns += [re_path(r'^api/.*$', core_views.not_found)]

handler404 = 'core.views.not_found'
handler500 = 'core.views.server_error'
