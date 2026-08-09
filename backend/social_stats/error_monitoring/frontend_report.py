# ============================================================================
#  Ingest React / browser errors into ErrorLog (+ optional screenshot file)
# ============================================================================
from __future__ import annotations

import uuid
from typing import Any

from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest

from .screenshots import save_frontend_screenshot
from .services.error_logger import ErrorLogger


def _client_ip(request: HttpRequest) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR')


def build_frontend_error_payload(
    data: dict[str, Any],
    *,
    request: HttpRequest,
    log_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    from django.conf import settings

    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    log_id = log_id or uuid.uuid4()
    message = (data.get('message') or data.get('exception_message') or 'Frontend error')[:8000]
    stack = (data.get('stack') or data.get('full_stack_trace') or '')[:65535]
    component_stack = (data.get('component_stack') or '')[:65535]
    if component_stack and component_stack not in stack:
        stack = f'{stack}\n\n--- React component stack ---\n{component_stack}'.strip()

    exc_type = (data.get('exception_type') or data.get('name') or 'FrontendError')[:255]
    source = (data.get('source') or 'frontend')[:64]
    page_url = (data.get('url') or data.get('page_url') or '')[:2048]
    reference = (data.get('reference_id') or '')[:64]

    user = getattr(request, 'user', None)
    payload: dict[str, Any] = {
        'id': str(log_id),
        'application_name': cfg.get('FRONTEND_APPLICATION_NAME')
        or f"{cfg.get('APPLICATION_NAME', 'social-stats')}-frontend",
        'environment': cfg.get('ENVIRONMENT') or 'Development',
        'severity': (data.get('severity') or 'ERROR')[:16],
        'exception_type': exc_type,
        'exception_message': message,
        'full_stack_trace': stack,
        'request_url': page_url,
        'request_method': 'GET',
        'request_path': (data.get('pathname') or '')[:512],
        'request_body': {
            'source': source,
            'reference_id': reference,
            'viewport': data.get('viewport') or {},
            'build': data.get('build') or {},
        },
        'user_agent': (request.META.get('HTTP_USER_AGENT') or '')[:2000],
        'client_ip': _client_ip(request),
        'error_category': 'frontend',
        'view_name': (data.get('component') or source)[:255],
        'workspace_id': str(data.get('workspace_id') or '')[:64],
    }

    if user and not isinstance(user, AnonymousUser):
        payload['authenticated_user_id'] = user.pk
        payload['username'] = getattr(user, 'username', '') or ''
        payload['email'] = getattr(user, 'email', '') or ''

    screenshot_b64 = data.get('screenshot_png_base64') or data.get('screenshot')
    if screenshot_b64:
        rel = save_frontend_screenshot(log_id, str(screenshot_b64))
        if rel:
            payload['screenshot_path'] = rel
            body = dict(payload.get('request_body') or {})
            body['screenshot_path'] = rel
            payload['request_body'] = body

    return payload


def report_frontend_error(data: dict[str, Any], *, request: HttpRequest) -> uuid.UUID | None:
    from django.conf import settings

    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    if not cfg.get('ENABLED', True):
        return None
    if not cfg.get('FRONTEND_REPORT_ENABLED', True):
        return None

    log_id = uuid.uuid4()
    payload = build_frontend_error_payload(data, request=request, log_id=log_id)
    row = ErrorLogger.log_payload(payload)
    return uuid.UUID(payload['id']) if row else log_id
