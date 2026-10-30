from django.contrib import admin

from .models import EmailTemplate


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('key', 'subject', 'updated_at')
    readonly_fields = ('updated_at',)
