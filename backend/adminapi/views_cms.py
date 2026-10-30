"""Admin CMS (contract 3.9: S01-S06, S13-S16). Default deny: every view is an AdminView."""
from __future__ import annotations

from core.idempotency import run_idempotent
from core.responses import iso, ok

from . import cms_service as cms
from . import editorial_service as ed
from . import media_service as ms
from .views import AdminView
from .views_events import AdminPagePagination


def _optional_body(request) -> dict:
    data = request.data if request.data else {}
    if not isinstance(data, dict):
        from core.errors import ValidationFailed
        raise ValidationFailed(fields={'form': ['Send a JSON object.']})
    return data


# ---------------------------------------------------------------- S01-S05

class SectionsView(AdminView):  # S01
    def get(self, request):
        return ok(cms.list_sections())


class SectionDetailView(AdminView):  # S02
    def get(self, request, key):
        return ok(cms.section_detail(key))


class SectionDraftView(AdminView):  # S03
    def put(self, request, key):
        return ok(cms.save_section_draft(request, key, ms.object_body(request)))


class SectionPublishView(AdminView):  # S04
    def post(self, request, key):
        data = _optional_body(request)
        return run_idempotent(request, lambda: ok(cms.publish_section(request, key, data)), required=True)


class SectionVersionsView(AdminView):  # S05
    def get(self, request, key):
        cms.check_section_key(key)
        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(cms.list_versions('site', key), request, view=self)
        return paginator.get_paginated_response([cms.version_dto(r) for r in page])


# ---------------------------------------------------------------- S06

class LegalView(AdminView):
    def get(self, request, page):
        return ok(cms.legal_detail(page))

    def put(self, request, page):
        return ok(cms.save_legal_draft(request, page, ms.object_body(request)))


class LegalPublishView(AdminView):
    def post(self, request, page):
        data = _optional_body(request)
        return run_idempotent(request, lambda: ok(cms.publish_legal(request, page, data)), required=True)


# ---------------------------------------------------------------- S13, S14

class StoriesView(AdminView):
    def get(self, request):
        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(ed.list_stories(request.query_params), request, view=self)
        return paginator.get_paginated_response([ed.story_dto(s, full=False) for s in page])

    def post(self, request):
        parsed = ed.parse_story_create(ms.object_body(request))
        return ok(ed.story_dto(ed.create_story(request, parsed)), status=201)


class StoryDetailView(AdminView):
    def get(self, request, story_id):
        return ok(ed.story_dto(ed.get_story(story_id)))

    def patch(self, request, story_id):
        version, parsed = ed.parse_story_patch(ms.object_body(request))
        return ok(ed.story_dto(ed.update_story(request, story_id, version, parsed)))


class StoryPublishView(AdminView):  # S14
    def post(self, request, story_id):
        def work():
            s = ed.publish_story(request, story_id)
            return ok({'id': str(s.pk), 'slug': s.slug, 'status': s.status, 'publishedAt': iso(s.updated_at),
                       'version': s.version})
        return run_idempotent(request, work, required=True)


class StoryUnpublishView(AdminView):  # S14
    def post(self, request, story_id):
        s = ed.unpublish_story(request, story_id)
        return ok({'id': str(s.pk), 'slug': s.slug, 'status': s.status, 'publishedAt': None, 'version': s.version})


# ---------------------------------------------------------------- S15, S16

class TestimonialsView(AdminView):
    def get(self, request):
        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(ed.list_testimonials(request.query_params), request, view=self)
        return paginator.get_paginated_response(ed.testimonial_dtos(page))

    def post(self, request):
        parsed = ed.parse_testimonial_create(ms.object_body(request))
        return ok(ed.testimonial_dto(ed.create_testimonial(request, parsed)), status=201)


class TestimonialDetailView(AdminView):
    def get(self, request, testimonial_id):
        return ok(ed.testimonial_dto(ed.get_testimonial(testimonial_id)))

    def patch(self, request, testimonial_id):
        version, parsed = ed.parse_testimonial_patch(ms.object_body(request))
        return ok(ed.testimonial_dto(ed.update_testimonial(request, testimonial_id, version, parsed)))


class TestimonialPublishView(AdminView):  # S16
    def post(self, request, testimonial_id):
        def work():
            t = ed.publish_testimonial(request, testimonial_id)
            return ok({'id': str(t.pk), 'status': 'published', 'version': t.version, 'at': iso(t.updated_at)})
        return run_idempotent(request, work, required=True)


class TestimonialUnpublishView(AdminView):  # S16
    def post(self, request, testimonial_id):
        t = ed.unpublish_testimonial(request, testimonial_id)
        return ok({'id': str(t.pk), 'status': 'draft', 'version': t.version, 'at': iso(t.updated_at)})
