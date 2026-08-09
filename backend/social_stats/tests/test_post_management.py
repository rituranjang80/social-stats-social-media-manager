from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from social_stats.models import Client, UserProfile, UnifiedPost, ClientPageConfig


class PostManagementApiTests(APITestCase):
    def setUp(self):
        self.agency = User.objects.create_user(
            username='sa@test.com', email='sa@test.com', password='pass12345',
        )
        UserProfile.objects.create(user=self.agency, role='superadmin')
        self.client_row = Client.objects.create(company='PM Co', is_active=True)
        ClientPageConfig.objects.update_or_create(
            client=self.client_row,
            defaults={'show_post_management': True},
        )
        UnifiedPost.objects.create(
            client=self.client_row,
            content='Future post',
            status='scheduled',
            scheduled_at=timezone.now() + timezone.timedelta(days=2),
            created_by=self.agency,
        )

    def test_list_requires_feature_and_permission(self):
        self.client.force_authenticate(user=self.agency)
        res = self.client.get('/api/post-management/posts/', {
            'client_id': self.client_row.id,
            'date_from': timezone.now().date().isoformat(),
            'date_to': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.data) >= 1)

    def test_disabled_feature_returns_403(self):
        cfg = self.client_row.page_config
        cfg.show_post_management = False
        cfg.save()
        self.client.force_authenticate(user=self.agency)
        res = self.client.get('/api/post-management/posts/', {
            'client_id': self.client_row.id,
            'date_from': timezone.now().date().isoformat(),
            'date_to': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
        })
        self.assertEqual(res.status_code, 403)
