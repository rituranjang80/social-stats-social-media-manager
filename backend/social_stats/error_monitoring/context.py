# ============================================================================
#  Extract traceback, request, and DRF context for error logs
# ============================================================================
from __future__ import annotations

import inspect
import json
import os
import socket
import sys
import threading
import traceback
import uuid
from typing import Any, Optional

from django.conf import settings
from django.db import connection
from django.http import HttpRequest
from django.utils import timezone

from .sanitization import sanitize_body, sanitize_headers, sanitize_locals


def _config() -> dict:
    return getattr(settings, 'ERROR_MONITORING', {}) or {}


def resolve_environment() -> str:
    cfg = _config()
    env = (cfg.get('ENVIRONMENT') or os.environ.get('APP_ENV') or '').strip()
    if env:
        return env
    if settings.DEBUG:
        return 'Development'
    return 'Production'


def resolve_application_name() -> str:
    return (_config().get('APPLICATION_NAME')
            or os.environ.get('APPLICATION_NAME')
            or 'social-stats')


def get_git_commit() -> str:
    return (_config().get('GIT_COMMIT')
            or os.environ.get('GIT_COMMIT')
            or os.environ.get('SOURCE_VERSION')
            or '')[:64]


def client_ip(request: HttpRequest | None) -> str:
    if not request:
        return ''
    xff = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    if xff:
        return xff[:45]
    return (request.META.get('REMOTE_ADDR') or '')[:45]


def request_id_from(request: HttpRequest | None) -> str:
    if not request:
        return ''
    rid = getattr(request, 'id', None) or request.META.get('HTTP_X_REQUEST_ID')
    return str(rid or '')[:64]


def workspace_id_from(request: HttpRequest | None) -> str:
    if not request:
        return ''
    for key in ('HTTP_X_CLIENT_ID', 'HTTP_X_WORKSPACE_ID'):
        val = (request.META.get(key) or '').strip()
        if val:
            return val[:64]
    try:
        if request.method == 'GET':
            return str(request.GET.get('client_id') or request.GET.get('workspace_id') or '')[:64]
    except Exception:
        pass
    return ''


def organization_id_from(user) -> str:
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    try:
        profile = getattr(user, 'profile', None)
        if profile is None:
            from social_stats.models import UserProfile
            profile = UserProfile.objects.filter(user_id=user.id).first()
        if not profile:
            return ''
        if profile.primary_agency_id:
            return str(profile.primary_agency_id)
        if profile.agency_id:
            return str(profile.agency_id)
        if profile.client_id:
            return str(profile.client_id)
    except Exception:
        pass
    return ''


def parse_request_body(request: HttpRequest | None) -> Any:
    if not request:
        return None
    try:
        raw = getattr(request, 'body', b'') or b''
        if not raw:
            return None
        if len(raw) > 65_536:
            return {'_truncated': True, 'preview': raw[:4096].decode('utf-8', errors='replace')}
        ct = (request.META.get('CONTENT_TYPE') or '').lower()
        if 'application/json' in ct:
            return sanitize_body(json.loads(raw.decode('utf-8')))
        return sanitize_body(raw.decode('utf-8', errors='replace'))
    except Exception:
        return {'_parse_error': True}


def collect_headers(request: HttpRequest | None) -> dict:
    if not request:
        return {}
    headers = {}
    for key, value in request.META.items():
        if key.startswith('HTTP_'):
            headers[key[5:].replace('_', '-').title()] = value
        elif key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            headers[key.replace('_', '-').title()] = value
    return sanitize_headers(headers)


def last_traceback_frame(exc: BaseException) -> dict[str, Any]:
    tb = exc.__traceback__
    if not tb:
        return {}
    while tb.tb_next:
        tb = tb.tb_next
    frame = tb.tb_frame
    info = inspect.getframeinfo(frame)
    locals_safe = sanitize_locals(frame.f_locals)
    return {
        'python_file': os.path.abspath(info.filename),
        'function_name': info.function,
        'line_number': info.lineno or 0,
        'source_module': frame.f_globals.get('__name__', ''),
        'class_name': _class_from_frame(frame),
        'local_variables': locals_safe,
    }


def _class_from_frame(frame) -> str:
    if 'self' in frame.f_locals:
        return type(frame.f_locals['self']).__name__
    if 'cls' in frame.f_locals:
        c = frame.f_locals['cls']
        return getattr(c, '__name__', str(c))
    return ''


def database_error_from(exc: BaseException) -> tuple[str, str]:
    name = type(exc).__name__
    if name not in ('IntegrityError', 'ProgrammingError', 'OperationalError', 'DataError'):
        return '', ''
    msg = str(exc)
    query = ''
    try:
        if connection.queries:
            query = connection.queries[-1].get('sql', '')
    except Exception:
        pass
    return query[:8192], msg[:2048]


def drf_context_from(request: HttpRequest | None) -> dict[str, str]:
    out = {'view_name': '', 'serializer_name': '', 'api_name': '', 'model_name': ''}
    if not request:
        return out
    view = getattr(request, 'resolver_match', None)
    if view:
        out['view_name'] = (view.view_name or view.url_name or '')[:255]
        if view.func:
            out['api_name'] = getattr(view.func, '__name__', '')[:255]
    drf = getattr(request, '_drf_error_context', None)
    if isinstance(drf, dict):
        out.update({k: str(drf.get(k, ''))[:255] for k in out})
    return out


def server_hostname() -> str:
    try:
        return socket.gethostname()[:255]
    except Exception:
        return ''


def build_log_payload(
    exc: BaseException,
    *,
    request: HttpRequest | None = None,
    severity: str = 'ERROR',
    response_status_code: int | None = None,
    execution_time_ms: int | None = None,
    error_log_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    frame = last_traceback_frame(exc)
    db_query, db_err = database_error_from(exc)
    suggestion = __import__(
        'social_stats.error_monitoring.suggestions',
        fromlist=['suggest_for_exception'],
    ).suggest_for_exception(exc, database_error=db_err)

    user = getattr(request, 'user', None) if request else None
    if user is not None and not getattr(user, 'is_authenticated', False):
        user = None

    log_id = error_log_id or uuid.uuid4()
    rid = request_id_from(request)
    try:
        req_uuid = uuid.UUID(rid) if rid and len(rid) >= 32 else log_id
    except ValueError:
        req_uuid = log_id

    return {
        'id': str(log_id),
        'created_at': timezone.now().isoformat(),
        'application_name': resolve_application_name(),
        'environment': resolve_environment(),
        'severity': severity,
        'exception_type': type(exc).__name__,
        'exception_message': str(exc)[:8192],
        'full_stack_trace': ''.join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        'python_file': frame.get('python_file', ''),
        'function_name': frame.get('function_name', ''),
        'class_name': frame.get('class_name', ''),
        'line_number': frame.get('line_number') or None,
        'source_module': frame.get('source_module', ''),
        'request_url': request.build_absolute_uri() if request else '',
        'request_method': getattr(request, 'method', '') if request else '',
        'request_path': getattr(request, 'path', '') if request else '',
        'query_parameters': sanitize_body(dict(request.GET)) if request else {},
        'request_body': parse_request_body(request),
        'http_headers': collect_headers(request),
        'local_variables': frame.get('local_variables', {}),
        'response_status_code': response_status_code,
        'authenticated_user_id': user.id if user else None,
        'username': getattr(user, 'username', '') if user else '',
        'email': getattr(user, 'email', '') if user else '',
        'client_ip': client_ip(request),
        'user_agent': (request.META.get('HTTP_USER_AGENT') or '')[:512] if request else '',
        'session_id': (request.session.session_key or '') if request and hasattr(request, 'session') else '',
        'request_id': str(req_uuid),
        'workspace_id': workspace_id_from(request),
        'organization_id': organization_id_from(user),
        'execution_time_ms': execution_time_ms,
        'server_hostname': server_hostname(),
        'process_id': os.getpid(),
        'thread_id': threading.get_ident(),
        'git_commit': get_git_commit(),
        'database_query': db_query,
        'database_error': db_err,
        'suggestion': suggestion.as_text(),
        'error_category': suggestion.error_category,
        'resolved': False,
        **drf_context_from(request),
    }
