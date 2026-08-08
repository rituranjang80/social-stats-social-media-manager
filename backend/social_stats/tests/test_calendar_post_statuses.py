# ============================================================================
#  Social Stats — tests for Publish calendar post-statuses API
# ============================================================================
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from social_stats.models import UserProfile


class CalendarPostStatusesApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cal', password='pass')
        UserProfile.objects.create(user=self.user, role='superadmin')

    def test_post_statuses_includes_list_tabs_and_approval_pills(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/calendar/post-statuses/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('filters', data)
        self.assertIn('list_tabs', data)
        self.assertIn('approval_pills', data)
        self.assertTrue(any(t['id'] == 'queue' for t in data['list_tabs']))
        self.assertTrue(any(t['id'] == 'approvals' for t in data['list_tabs']))
        self.assertTrue(any(p['id'] == 'all' for p in data['approval_pills']))
        for tab in data['list_tabs']:
            if tab.get('panel') != 'approvals':
                self.assertTrue(tab.get('match'))
