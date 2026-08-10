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

    def test_status_change_requires_comment_and_logs(self):
        from social_stats.post_management_models import PostManagementStatusChange

        self.client.force_authenticate(user=self.agency)
        post = UnifiedPost.objects.filter(client=self.client_row).first()
        res = self.client.patch(
            f'/api/post-management/posts/{post.pk}/status/',
            {
                'client_id': self.client_row.id,
                'status': 'draft',
                'source': 'composer',
                'comment': 'Moving back for edits',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        post.refresh_from_db()
        self.assertEqual(post.status, 'draft')
        log = PostManagementStatusChange.objects.filter(
            client=self.client_row, post_id=post.pk, post_source='composer',
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.comment, 'Moving back for edits')
        self.assertEqual(log.changed_by_id, self.agency.pk)

    def test_status_change_rejects_missing_comment(self):
        self.client.force_authenticate(user=self.agency)
        post = UnifiedPost.objects.filter(client=self.client_row).first()
        res = self.client.patch(
            f'/api/post-management/posts/{post.pk}/status/',
            {
                'client_id': self.client_row.id,
                'status': 'draft',
                'source': 'composer',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 400)


class PostManagementDigestTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='digest@test.com', email='digest@test.com', password='pass12345',
        )
        self.client_row = Client.objects.create(
            company='Digest Co',
            name='Digest Client',
            email='digest-client@example.com',
            is_active=True,
        )
        ClientPageConfig.objects.update_or_create(
            client=self.client_row,
            defaults={'show_post_management': True},
        )

    def test_counts_draft_and_skips_empty_clients(self):
        from datetime import date, timedelta
        from social_stats.post_management_digest import count_post_management_buckets, run_post_management_client_digests

        today = date.today()
        UnifiedPost.objects.create(
            client=self.client_row,
            content='Draft item',
            status='draft',
            created_by=self.user,
        )
        counts = count_post_management_buckets(
            self.client_row,
            today - timedelta(days=30),
            today,
        )
        self.assertEqual(counts['draft'], 1)

        result = run_post_management_client_digests(dry_run=True)
        self.assertGreaterEqual(result['sent'], 1)
