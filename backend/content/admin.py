"""Django admin for local content editing. Slug becomes read-only once an item has been published.

NOTE: the admin site itself needs django.contrib.admin, sessions, auth and messages middleware in pgchess/settings.py
(owned by the platform slice). Registration here is import-safe without them.
"""
from django.contrib import admin

from . import models as m


class SlugLockAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        base = list(super().get_readonly_fields(request, obj))
        if obj is not None and obj.first_published_at is not None:
            base.append('slug')
        return base + ['version', 'first_published_at']


class MediaItemInline(admin.TabularInline):
    model = m.MediaCollectionItem
    extra = 0


@admin.register(m.Event)
class EventAdmin(SlugLockAdmin):
    list_display = ('slug', 'title', 'status', 'starts_at', 'confirmed_count', 'capacity', 'version')
    list_filter = ('status', 'type', 'audience')
    search_fields = ('slug', 'title')


@admin.register(m.Story)
class StoryAdmin(SlugLockAdmin):
    list_display = ('slug', 'kind', 'status', 'published_on', 'featured', 'version')
    list_filter = ('status', 'kind')


@admin.register(m.SiteSection)
class SiteSectionAdmin(admin.ModelAdmin):
    list_display = ('key', 'status', 'version', 'updated_at')
    readonly_fields = ('version', 'first_published_at')

    def get_readonly_fields(self, request, obj=None):
        base = list(super().get_readonly_fields(request, obj))
        return base + (['key'] if obj is not None else [])


@admin.register(m.Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'published', 'consent_at', 'sort_order', 'version')
    readonly_fields = ('version',)


@admin.register(m.LegalPage)
class LegalPageAdmin(admin.ModelAdmin):
    list_display = ('page', 'title', 'effective_date', 'version')
    readonly_fields = ('version',)


@admin.register(m.MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ('src', 'alt', 'width', 'height', 'version')
    readonly_fields = ('version',)


@admin.register(m.MediaCollection)
class MediaCollectionAdmin(admin.ModelAdmin):
    list_display = ('key', 'mode', 'version')
    readonly_fields = ('version',)
    inlines = [MediaItemInline]


@admin.register(m.PublicSettings)
class PublicSettingsAdmin(admin.ModelAdmin):
    readonly_fields = ('version',)

    def has_add_permission(self, request):
        return not m.PublicSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(m.ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('topic', 'created_at')
    readonly_fields = [f.name for f in m.ContactMessage._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(m.RevalidationOutbox)
class OutboxAdmin(admin.ModelAdmin):
    list_display = ('type', 'action', 'slug', 'status', 'attempts', 'occurred_at')
    list_filter = ('status', 'type')
    readonly_fields = [f.name for f in m.RevalidationOutbox._meta.fields]

    def has_add_permission(self, request):
        return False
