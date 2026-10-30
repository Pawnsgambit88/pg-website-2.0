from django.urls import path

from . import views

# Mounted at /api/auth/ (no trailing slashes, per the contract).
urlpatterns = [
    path('register', views.RegisterView.as_view()),
    path('login', views.LoginView.as_view()),
    path('refresh', views.RefreshView.as_view()),
    path('logout', views.LogoutView.as_view()),
    path('me', views.MeView.as_view()),
    path('password-reset', views.PasswordResetRequestView.as_view()),
    path('password-reset/confirm', views.PasswordResetConfirmView.as_view()),
    path('step-up', views.StepUpView.as_view()),
    path('oauth/google/start', views.OAuthStartView.as_view()),
    path('oauth/exchange', views.OAuthExchangeView.as_view()),
    path('oauth/google/callback', views.OAuthCallbackView.as_view()),
]
