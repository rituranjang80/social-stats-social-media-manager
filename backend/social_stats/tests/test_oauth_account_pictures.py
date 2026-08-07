"""Tests for social account profile picture fetch/cache."""
from unittest.mock import patch

from django.test import TestCase

from social_stats.models import Client, PlatformCredential
from social_stats.oauth_account_pictures import ensure_account_picture_url, fetch_account_picture_url


class OAuthAccountPictureTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(
            name='Pic', company='Pic Co', email='pic@test.local',
        )

    @patch('social_stats.oauth_account_pictures.requests.get')
    def test_facebook_picture_saved_on_ensure(self, mock_get):
        mock_get.return_value.json.return_value = {
            'data': {'url': 'https://cdn.example/fb-page.jpg', 'is_silhouette': False},
        }
        cred = PlatformCredential.objects.create(
            client=self.client_obj,
            platform='facebook',
            access_token='tok',
            page_id='12345',
        )
        url = ensure_account_picture_url(cred)
        self.assertEqual(url, 'https://cdn.example/fb-page.jpg')
        cred.refresh_from_db()
        self.assertEqual(cred.account_picture_url, 'https://cdn.example/fb-page.jpg')

    def test_fetch_youtube_uses_channel_id(self):
        cred = PlatformCredential.objects.create(
            client=self.client_obj,
            platform='youtube',
            access_token='tok',
            channel_id='UCxyz',
        )
        with patch('social_stats.oauth_account_pictures._youtube_picture_url') as mock_yt:
            mock_yt.return_value = 'https://yt.example/thumb.jpg'
            self.assertEqual(fetch_account_picture_url(cred), 'https://yt.example/thumb.jpg')

    def test_ensure_skips_network_when_cached(self):
        cred = PlatformCredential.objects.create(
            client=self.client_obj,
            platform='linkedin',
            access_token='tok',
            account_picture_url='https://cdn.example/li.jpg',
        )
        with patch('social_stats.oauth_account_pictures.requests.get') as mock_get:
            url = ensure_account_picture_url(cred)
        mock_get.assert_not_called()
        self.assertEqual(url, 'https://cdn.example/li.jpg')
