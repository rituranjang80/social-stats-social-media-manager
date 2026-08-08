from datetime import date

from django.test import TestCase

from social_stats.models import Client, UnifiedPost, UserProfile
from django.contrib.auth.models import User

from social_stats.publish_list_dates import filter_queryset_by_publish_date


class PublishListDateFilterTests(TestCase):
    def setUp(self):
        self.client = Client.objects.create(company='Range Co')
        self.user = User.objects.create_user(username='u', password='x')
        UserProfile.objects.create(user=self.user, role='superadmin')

    def test_filters_by_scheduled_date_in_range(self):
        in_range = UnifiedPost.objects.create(
            client=self.client,
            title='In',
            content='x',
            status='scheduled',
            scheduled_at='2026-11-07T10:00:00Z',
        )
        UnifiedPost.objects.create(
            client=self.client,
            title='Out',
            content='x',
            status='scheduled',
            scheduled_at='2026-08-01T10:00:00Z',
        )
        qs = filter_queryset_by_publish_date(
            UnifiedPost.objects.all(),
            '2026-11-01',
            '2026-11-30',
        )
        self.assertEqual(list(qs.values_list('id', flat=True)), [in_range.id])
