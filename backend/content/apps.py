from django.apps import AppConfig


class ContentConfig(AppConfig):
    name = 'content'
    label = 'content'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        from . import signals  # noqa: F401  (publish transitions -> revalidation outbox)
