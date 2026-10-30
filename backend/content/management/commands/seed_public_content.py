"""Idempotent loader for the public starter content (upsert by slug/key; safe to re-run).

Rows are only saved when a field actually changed, so re-running does not bump `version` or enqueue revalidation.
Only rows this command owns (the slugs/keys in content/seed_data.py) are touched; nothing is deleted.
Relative events keep their original dates on re-runs (they move only when the row is first created).
"""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from content import seed_data as d
from content.models import (Event, LegalPage, MediaAsset, MediaCollection, MediaCollectionItem, PublicSettings,
                            SiteSection, Story, Testimonial)

IST = ZoneInfo('Asia/Kolkata')


def ist_at(days, hhmm, today):
    h, m = map(int, hhmm.split(':'))
    return datetime.combine(today + timedelta(days=days), time(h, m), tzinfo=IST)


def upsert(model, lookup, values):
    """Create or update; saves only when something differs. Returns (obj, 'created'|'updated'|'unchanged')."""
    obj = model.objects.filter(**lookup).first()
    if obj is None:
        obj = model(**lookup, **values)
        obj.save()
        return obj, 'created'
    changed = False
    for field, value in values.items():
        if getattr(obj, field) != value:
            setattr(obj, field, value)
            changed = True
    if changed:
        obj.save()
    return obj, 'updated' if changed else 'unchanged'


class Command(BaseCommand):
    help = 'Load or refresh the public starter content (events, sections, stories, testimonials, legal, settings).'

    @transaction.atomic
    def handle(self, *args, **options):
        counts = {}

        def tally(kind, result):
            counts.setdefault(kind, {}).setdefault(result, 0)
            counts[kind][result] += 1

        today = timezone.now().astimezone(IST).date()

        assets = {}
        for key, a in d.ASSETS.items():
            obj, res = upsert(MediaAsset, {'src': a['src'], 'alt': a['alt']}, {
                'decorative': False, 'width': a['width'], 'height': a['height'],
                'focal_x': a['focal'][0], 'focal_y': a['focal'][1], 'blur_data_url': a['blur'],
            })
            assets[key] = obj
            tally('media assets', res)

        collections = {}
        for key, asset_keys in d.COLLECTIONS.items():
            mode = 'carousel' if len(asset_keys) > 1 else 'static'
            col, res = upsert(MediaCollection, {'key': key}, {'mode': mode, 'autoplay': False, 'interval_ms': 6000})
            wanted = [assets[k].pk for k in asset_keys]
            if [i.asset_id for i in col.items.all()] != wanted:
                col.items.all().delete()
                for order, pk in enumerate(wanted):
                    MediaCollectionItem.objects.create(collection=col, asset_id=pk, order=order)
                col.save()
                res = 'updated' if res == 'unchanged' else res
            collections[key] = col
            tally('media collections', res)

        for key, content in d.SECTIONS.items():
            _, res = upsert(SiteSection, {'key': key}, {'content': content, 'status': 'published'})
            tally('site sections', res)

        for e in d.EVENTS:
            archive = e.get('archive')
            values = {
                **d.VENUE,
                'title': e['title'], 'promise': e['promise'], 'description': e['description'], 'type': e['type'],
                'audience': e['audience'], 'status': e['status'], 'pairing_mode': e['pairing_mode'],
                'format': e['format'], 'time_control': e['time_control'], 'price_paise': e['price_paise'],
                'rated': e['rated'], 'rating_pool': e['rating_pool'], 'first_timer_count': e['first_timer_count'],
                'capacity': e['capacity'], 'confirmed_count': e['confirmed'], 'waitlist_enabled': e['waitlist'],
                'experience': d.EXPERIENCE, 'faq': d.FAQ, 'logistics': d.LOGISTICS,
                'at_a_glance': {'membershipRequired': False, 'hostedArrival': True},
                'cover': assets[e['cover']], 'media': collections[e['collection']],
                'archive_published': bool(archive),
                'recap': archive['recap'] if archive else '',
                'winner': archive['winner'] if archive else None,
                'standings': archive['standings'] if archive else [],
                'rounds_played': archive['rounds_played'] if archive else 0,
                'archive_gallery': collections[archive['gallery']] if archive else None,
            }
            if Event.objects.filter(slug=e['slug']).exists():
                pass  # keep the dates chosen at first load
            elif 'starts_abs' in e:
                values.update(starts_at=parse_datetime(e['starts_abs']), ends_at=parse_datetime(e['ends_abs']),
                              registration_opens_at=parse_datetime(e['opens_abs']),
                              registration_closes_at=parse_datetime(e['closes_abs']))
            else:
                values.update(starts_at=ist_at(*e['starts'], today), ends_at=ist_at(*e['ends'], today),
                              registration_opens_at=ist_at(*e['opens'], today),
                              registration_closes_at=ist_at(*e['closes'], today))
            obj, res = upsert(Event, {'slug': e['slug']}, values)
            tally('events', res)

        for s in d.STORIES:
            values = {
                'kind': s['kind'], 'eyebrow': s['eyebrow'], 'title': s['title'], 'dek': s['dek'],
                'published_on': datetime.strptime(s['published_on'], '%Y-%m-%d').date(),
                'reading_minutes': s['reading_minutes'], 'featured': s['featured'], 'body': s['body'],
                'cover': assets[s['cover']] if s['cover'] else None, 'status': 'published',
            }
            _, res = upsert(Story, {'slug': s['slug']}, values)
            tally('stories', res)

        for order, t in enumerate(d.TESTIMONIALS):
            existing = Testimonial.objects.filter(pk=t['id']).first()
            values = {
                'quote': t['quote'], 'name': t['name'], 'descriptor': t['descriptor'],
                'portrait': assets[t['portrait']], 'published': True, 'sort_order': order,
                'consent_at': existing.consent_at if existing and existing.consent_at else timezone.now(),
            }
            _, res = upsert(Testimonial, {'pk': t['id']}, values)
            tally('testimonials', res)

        for p in d.LEGAL:
            _, res = upsert(LegalPage, {'page': p['page']}, {
                'title': p['title'], 'blocks': p['blocks'],
                'effective_date': datetime.strptime(p['effective_date'], '%Y-%m-%d').date(),
            })
            tally('legal pages', res)

        row = PublicSettings.load()
        if row is None:
            PublicSettings(**d.PUBLIC_SETTINGS).save()
            tally('public settings', 'created')
        elif any(getattr(row, k) != val for k, val in d.PUBLIC_SETTINGS.items()):
            for k, val in d.PUBLIC_SETTINGS.items():
                setattr(row, k, val)
            row.save()
            tally('public settings', 'updated')
        else:
            tally('public settings', 'unchanged')

        for kind, result in counts.items():
            self.stdout.write(f'{kind}: ' + ', '.join(f'{n} {r}' for r, n in result.items()))
