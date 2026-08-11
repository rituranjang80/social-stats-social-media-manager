from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from social_stats.models import UserProfile
from social_stats.social_auth_views import _make_jwt, _redirect_social_login_success


class SocialAuthExchangeTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_exchange_returns_tokens_and_is_one_time(self):
        user = User.objects.create_user(username='social@test.com', email='social@test.com', password='x')
        UserProfile.objects.create(user=user, role='client')

        access, refresh = _make_jwt(user)
        request = self.client.get('/').wsgi_request
        request.session = self.client.session
        response = _redirect_social_login_success(access, refresh)
        self.assertEqual(response.status_code, 302)
        location = response['Location']
        self.assertIn('code=', location)
        code = location.split('code=')[1].split('&')[0]

        res = self.client.post('/api/auth/social/exchange/', {'code': code}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['access'], access)
        self.assertEqual(res.data['refresh'], refresh)

        again = self.client.post('/api/auth/social/exchange/', {'code': code}, format='json')
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data['access'], access)

    def test_repeated_exchanges_for_different_codes(self):
        user = User.objects.create_user(username='a@test.com', email='a@test.com', password='x')
        UserProfile.objects.create(user=user, role='client')
        access, refresh = _make_jwt(user)

        for i in range(5):
            response = _redirect_social_login_success(access, refresh)
            code = response['Location'].split('code=')[1].split('&')[0]
            res = self.client.post('/api/auth/social/exchange/', {'code': code}, format='json')
            self.assertEqual(res.status_code, 200, msg=f'iteration {i}')
            dup = self.client.post('/api/auth/social/exchange/', {'code': code}, format='json')
            self.assertEqual(dup.status_code, 200, msg=f'duplicate iteration {i}')
