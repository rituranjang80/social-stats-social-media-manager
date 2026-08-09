from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from social_stats.error_monitoring.models import ErrorLog


@override_settings(
    ERROR_MONITORING={
        'ENABLED': True,
        'ASYNC': False,
        'DEDUP_SECONDS': 0,
        'FRONTEND_REPORT_ENABLED': True,
        'SCREENSHOT_ENABLED': True,
        'SCREENSHOT_DIR': '',
        'APPLICATION_NAME': 'social-stats-test',
        'ENVIRONMENT': 'Test',
    },
    MEDIA_ROOT='/tmp/socialstats_test_media',
)
class FrontendErrorReportTests(APITestCase):
    def test_client_report_creates_error_log(self):
        res = self.client.post('/api/errors/client-report/', {
            'message': 'Test render blow-up',
            'stack': 'Error: Test render blow-up\n    at App.js:1:1',
            'source': 'error_boundary',
            'url': 'http://localhost:3000/admin/analytics/post-management',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get('error_id'))
        row = ErrorLog.objects.get(pk=res.data['error_id'])
        self.assertEqual(row.error_category, 'frontend')
        self.assertIn('Test render', row.exception_message)

    def test_screenshot_path_persisted(self):
        # Minimal valid 1x1 PNG
        png_b64 = (
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGA'
            'hKmMIQAAAABJRU5ErkJggg=='
        )
        res = self.client.post('/api/errors/client-report/', {
            'message': 'With screenshot',
            'stack': 'Error: x',
            'screenshot_png_base64': png_b64,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        row = ErrorLog.objects.get(pk=res.data['error_id'])
        self.assertTrue(row.screenshot_path)
        self.assertIn('error_screenshots', row.screenshot_path)
        self.assertEqual(row.request_body.get('screenshot_path'), row.screenshot_path)

    def test_client_report_with_auth(self):
        user = User.objects.create_user(username='u@test.com', email='u@test.com', password='x')
        self.client.force_authenticate(user=user)
        res = self.client.post('/api/errors/client-report/', {
            'message': 'Authenticated FE error',
            'stack': 'stack',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        row = ErrorLog.objects.get(pk=res.data['error_id'])
        self.assertEqual(row.email, 'u@test.com')
