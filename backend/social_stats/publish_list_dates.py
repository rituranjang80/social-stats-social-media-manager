# ============================================================================
#  Publish list — filter UnifiedPost (and similar) by visible calendar date.
# ============================================================================
from __future__ import annotations

from django.db.models import Q

from .date_utils_fast import parse_publish_date_range

__all__ = ['parse_publish_date_range', 'filter_queryset_by_publish_date']


def filter_queryset_by_publish_date(qs, date_from_str, date_to_str):
    """Keep rows whose schedule, publish, or created (draft) date falls in range."""
    start, end = parse_publish_date_range(date_from_str, date_to_str)
    if not start or not end:
        return qs
    return qs.filter(
        Q(scheduled_at__date__gte=start, scheduled_at__date__lte=end)
        | Q(published_at__date__gte=start, published_at__date__lte=end)
        | Q(
            scheduled_at__isnull=True,
            published_at__isnull=True,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
    )
