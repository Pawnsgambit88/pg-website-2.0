from django.urls import path

from . import views

# Mounted at /api/ (contract 3.4 M10-M12).
urlpatterns = [
    path('me/ratings', views.RatingsView.as_view()),
    path('me/ratings/<str:pool>/ledger', views.LedgerView.as_view()),
    path('me/ratings/<str:pool>/trend', views.TrendView.as_view()),
]
