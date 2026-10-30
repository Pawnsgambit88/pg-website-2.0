"""Wire content changes to the revalidation outbox (events, stories, testimonials, sections, legal pages, media).

Signals run inside the saving transaction (`VersionedModel.save` wraps the save in `atomic`, deletes run in the
collector's transaction), so the outbox row commits or rolls back with the content change. Queryset `update()` calls
bypass signals on purpose; code that uses them must call `revalidation.emit()` itself.
"""
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import (Event, LegalPage, MediaAsset, MediaCollection, MediaCollectionItem, SiteSection, Story,
                     Testimonial)
from .revalidation import emit_media_changed, notify_publish


def _was_public(model, pk):
    row = model.objects.filter(pk=pk).first()
    return row, (row is not None and row.is_public)


def _remember(sender, instance, **kwargs):
    if instance._state.adding:
        instance._prev_public, instance._prev_status = False, None
    else:
        row, public = _was_public(sender, instance.pk)
        instance._prev_public, instance._prev_status = public, getattr(row, 'status', None)


for _model in (Event, Story, SiteSection, Testimonial, LegalPage):
    pre_save.connect(_remember, sender=_model, weak=False, dispatch_uid=f'remember_{_model.__name__}')


def _action(instance):
    was, now = instance._prev_public, instance.is_public
    if now and not was:
        return 'published'
    if was and not now:
        return 'unpublished'
    if not now:
        return None
    status = getattr(instance, 'status', None)
    if isinstance(instance, Event) and status != instance._prev_status:
        if status == 'cancelled':
            return 'cancelled'
        if status == 'completed':
            return 'completed'
    return 'updated'


@receiver(post_save, sender=Event)
@receiver(post_save, sender=Story)
def _slugged_saved(sender, instance, **kwargs):
    action = _action(instance)
    if action:
        notify_publish('event' if sender is Event else 'story', action, instance.slug,
                       entity_id=instance.pk, version=instance.version)


@receiver(post_save, sender=SiteSection)
def _section_saved(sender, instance, **kwargs):
    action = _action(instance)
    if action:
        notify_publish('site', action, instance.key, version=instance.version)


@receiver(post_save, sender=LegalPage)
def _legal_saved(sender, instance, **kwargs):
    notify_publish('legal', _action(instance) or 'updated', instance.page, version=instance.version)


@receiver(post_save, sender=Testimonial)
def _testimonial_saved(sender, instance, **kwargs):
    action = _action(instance)
    if action:
        notify_publish('testimonial', action, instance.pk, version=instance.version)


@receiver(post_delete, sender=Event)
@receiver(post_delete, sender=Story)
def _slugged_deleted(sender, instance, **kwargs):
    if instance.is_public:
        notify_publish('event' if sender is Event else 'story', 'deleted', instance.slug,
                       entity_id=instance.pk, version=instance.version + 1)


@receiver(post_delete, sender=SiteSection)
def _section_deleted(sender, instance, **kwargs):
    if instance.is_public:
        notify_publish('site', 'deleted', instance.key, version=instance.version + 1)


@receiver(post_delete, sender=Testimonial)
def _testimonial_deleted(sender, instance, **kwargs):
    if instance.is_public:
        notify_publish('testimonial', 'deleted', instance.pk, version=instance.version + 1)


@receiver(post_delete, sender=LegalPage)
def _legal_deleted(sender, instance, **kwargs):
    notify_publish('legal', 'deleted', instance.page, version=instance.version + 1)


# ---- media: one `updated` row per referencing entity (never a coarse media row) ----

@receiver(post_save, sender=MediaAsset)
def _asset_saved(sender, instance, created, **kwargs):
    if not created:
        emit_media_changed(asset_ids=[instance.pk])


@receiver(post_save, sender=MediaCollection)
def _collection_saved(sender, instance, created, **kwargs):
    if not created:
        emit_media_changed(collection_ids=[instance.pk])


@receiver(post_save, sender=MediaCollectionItem)
@receiver(post_delete, sender=MediaCollectionItem)
def _collection_item_changed(sender, instance, **kwargs):
    emit_media_changed(collection_ids=[instance.collection_id])
