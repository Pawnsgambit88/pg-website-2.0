from django.urls import path

from . import webhooks

# Mounted at /api/. W01 is not a PgApi method: no envelope, no bearer auth, no per-user rate limit.
urlpatterns = [
    path('webhooks/razorpay', webhooks.razorpay_webhook),
]
