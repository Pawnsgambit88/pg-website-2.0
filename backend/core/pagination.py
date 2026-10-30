"""Page-number pagination (contract 2.3): ?page=&page_size= -> meta.pagination. Never `next`/`previous` URLs (L-16)."""
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .errors import ValidationFailed


class PagePagination(PageNumberPagination):
    page_size = 20
    page_query_param = 'page'
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            raise ValidationFailed(fields={'page': ['This page does not exist.']}) from None

    def get_paginated_response(self, data):
        paginator = self.page.paginator
        response = Response(data)
        response.pagination = {
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total': paginator.count,
            'total_pages': paginator.num_pages if paginator.count else 0,
        }
        return response
