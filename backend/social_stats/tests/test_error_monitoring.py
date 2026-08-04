# ============================================================================
#  Error monitoring — unit & integration tests
# ============================================================================
from __future__ import annotations

import uuid

from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase, override_settings
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from social_stats.error_monitoring.context import build_log_payload
from social_stats.error_monitoring.models import ErrorLog
from social_stats.error_monitoring.sanitization import sanitize_body, sanitize_headers
from social_stats.error_monitoring.services.error_logger import ErrorLogger, persist_payload
from social_stats.error_monitoring.exception_handler import custom_exception_handler
from social_stats.models import UserProfile


class SanitizationTests(TestCase):
    def test_redacts_password_in_body(self):
        body = sanitize_body({'username': 'a', 'password': 'secret'})
        self.assertEqual(body['password'], '[REDACTED]')
        self.assertEqual(body['username'], 'a')

    def test_redacts_authorization_header(self):
        headers = sanitize_headers({'Authorization': 'Bearer x', 'Accept': 'json'})
        self.assertEqual(headers['Authorization'], '[REDACTED]')


class ErrorLoggerTests(TestCase):
    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 0})
    def test_log_composer_publish_failure(self):
        from social_stats.publishers import PublishError

        exc = PublishError('IG broken', code='graph_error')
        log_id = ErrorLogger.log_composer_publish_failure(
            unified_post_id=42,
            client_id=7,
            platform='instagram',
            error_code='graph_error',
            message='IG broken',
            exception=exc,
            async_log=False,
        )
        self.assertIsNotNone(log_id)
        row = ErrorLog.objects.get(pk=log_id)
        self.assertEqual(row.error_category, 'composer_publish')
        self.assertEqual(row.workspace_id, '7')
        self.assertEqual(row.request_body.get('platform'), 'instagram')

    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 0})
    def test_log_exception_persists_row(self):
        exc = ValueError('boom')
        log_id = ErrorLogger.log_exception(exc, severity='ERROR', async_log=False)
        self.assertIsNotNone(log_id)
        row = ErrorLog.objects.get(pk=log_id)
        self.assertEqual(row.exception_type, 'ValueError')
        self.assertIn('boom', row.exception_message)
        self.assertIn('ValueError', row.full_stack_trace)


class ExceptionHandlerTests(TestCase):
    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 0})
    def test_handler_adds_error_id(self):
        request = RequestFactory().get('/api/test/')
        request.id = uuid.uuid4().hex
        exc = ValidationError('bad input')
        response = custom_exception_handler(exc, {'request': request, 'view': None})
        self.assertIsNotNone(response)
        self.assertIn('error_id', response.data)
        self.assertIn('timestamp', response.data)
        self.assertFalse(response.data.get('success', True))

    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 0})
    def test_unhandled_returns_500_shape(self):
        request = RequestFactory().get('/api/test/')
        exc = RuntimeError('fail')
        response = custom_exception_handler(exc, {'request': request, 'view': None})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data.get('message'), 'Internal Server Error')
        self.assertIn('error_id', response.data)


class ErrorLogAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='staff@x.test', email='staff@x.test', password='Testpass12345!',
        )
        UserProfile.objects.create(user=self.staff, role='staff')
        self.client.force_authenticate(user=self.staff)

    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 0})
    def test_list_and_resolve(self):
        payload = build_log_payload(ValueError('api-fail'))
        persist_payload(payload)
        list_res = self.client.get('/api/errors/')
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(list_res.data['count'], 1)

        err_id = list_res.data['results'][0]['id']
        detail = self.client.get(f'/api/errors/{err_id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIn('full_stack_trace', detail.data)

        resolve = self.client.post(f'/api/errors/{err_id}/resolve/', {'notes': 'fixed'}, format='json')
        self.assertEqual(resolve.status_code, 200)
        self.assertTrue(resolve.data['resolved'])

    def test_forbidden_for_client_user(self):
        client_user = User.objects.create_user(
            username='client@x.test', email='client@x.test', password='Testpass12345!',
        )
        UserProfile.objects.create(user=client_user, role='client')
        self.client.force_authenticate(user=client_user)
        res = self.client.get('/api/errors/')
        self.assertEqual(res.status_code, 403)


class DedupTests(TestCase):
    @override_settings(ERROR_MONITORING={'ENABLED': True, 'ASYNC': False, 'DEDUP_SECONDS': 60})
    def test_duplicate_suppressed(self):
        payload = build_log_payload(ValueError('dup'))
        self.assertIsNotNone(persist_payload(payload))
        self.assertIsNone(persist_payload(payload))
