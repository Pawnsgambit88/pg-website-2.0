from django.urls import path

from . import views

# Slugs are matched loosely here and validated in the selectors, so a malformed slug is a 404 envelope, not a 500.
urlpatterns = [
    path('site/<str:section>', views.SiteSectionView.as_view()),
    path('events', views.EventListView.as_view()),
    path('events/<str:slug>', views.EventDetailView.as_view()),
    path('events/<str:slug>/availability', views.EventAvailabilityView.as_view()),
    path('past-events', views.PastEventListView.as_view()),
    path('stories', views.StoryListView.as_view()),
    path('stories/<str:slug>', views.StoryDetailView.as_view()),
    path('testimonials', views.TestimonialListView.as_view()),
    path('legal/<str:page>', views.LegalPageView.as_view()),
    path('sitemap-entries', views.SitemapEntriesView.as_view()),
    path('settings/public', views.PublicSettingsView.as_view()),
    path('preview/exchange', views.PreviewExchangeView.as_view()),
    path('contact', views.ContactView.as_view()),
]
