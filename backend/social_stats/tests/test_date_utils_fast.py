"""Tests for date helpers (Cython or pure-Python fallback)."""
from datetime import date

from django.test import SimpleTestCase

from social_stats.date_utils_fast import (
    parse_publish_date_range,
    parse_since_until_dates,
    using_cython,
)
from social_stats.publish_list_dates import filter_queryset_by_publish_date


class DateUtilsFastTests(SimpleTestCase):
    def test_parse_publish_date_range_swaps_inverted(self):
        start, end = parse_publish_date_range('2026-03-10', '2026-03-01')
        self.assertEqual(start, date(2026, 3, 1))
        self.assertEqual(end, date(2026, 3, 10))

    def test_parse_publish_date_range_single_side(self):
        start, end = parse_publish_date_range('2026-05-01', None)
        self.assertEqual(start, end)

    def test_parse_since_until_defaults(self):
        since, until = parse_since_until_dates(None, None, default_days=7)
        self.assertLessEqual((until - since).days, 7)

    def test_using_cython_is_bool(self):
        self.assertIsInstance(using_cython(), bool)

    def test_filter_queryset_no_dates_is_noop(self):
        from social_stats.models import UnifiedPost
        qs = UnifiedPost.objects.all()
        out = filter_queryset_by_publish_date(qs, None, None)
        self.assertIs(out, qs)
