"""Composer POST accepts workspace public UUID (client field read-only on serializer)."""
import uuid

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.models import Client, UserProfile, UnifiedPost


def _client(label='c'):
    return Client.objects.create(
        name=label, company=label.title(),
        email=f'{label}-{uuid.uuid4().hex[:8]}@x.test',
    )


def _superadmin():
    u = User.objects.create_user(
        username=f'admin-{uuid.uuid4().hex[:10]}',
        email=f'{uuid.uuid4().hex[:8]}@x.test',
        password='x', is_active=True,
    )
    UserProfile.objects.create(user=u, role='superadmin')
    return u


class ComposerClientUuidTests(TestCase):
    def setUp(self):
        self.workspace = _client('ws')
        self.user = _superadmin()
        self.api = APIClient()
        self.api.force_authenticate(user=self.user)

    def test_create_post_with_public_uuid_client_in_body(self):
        ref = str(self.workspace.public_id)
        res = self.api.post(
            '/api/composer/posts/',
            {
                'content': 'Hello from composer',
                'media_type': 'text',
                'target_platforms': ['facebook'],
                'client': ref,
                'client_id': ref,
            },
            format='json',
        )
        self.assertEqual(res.status_code, 201, res.data)
        post = UnifiedPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.client_id, self.workspace.id)
