# ============================================================================
#  ErrorLogger — central service for persisting exceptions
# ============================================================================
from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Any, Optional

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest
from django.utils import timezone

from ..context import build_log_payload
from ..models import ErrorLog

logger = logging.getLogger(__name__)


def _enabled() -> bool:
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    return cfg.get('ENABLED', True)


def _async_enabled() -> bool:
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    return cfg.get('ASYNC', True)


def _dedup_seconds() -> int:
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    return int(cfg.get('DEDUP_SECONDS', 30))


def _dedup_key(payload: dict[str, Any]) -> str:
    raw = '|'.join([
        payload.get('exception_type', ''),
        payload.get('exception_message', '')[:200],
        payload.get('request_path', ''),
        str(payload.get('line_number', '')),
        payload.get('function_name', ''),
    ])
    return hashlib.sha256(raw.encode('utf-8', errors='replace')).hexdigest()


def _is_duplicate(payload: dict[str, Any]) -> bool:
    window = _dedup_seconds()
    if window <= 0:
        return False
    key = f'error_monitoring:dedup:{_dedup_key(payload)}'
    if cache.add(key, '1', timeout=window):
        return False
    return True


def _normalize_body_for_json(body: Any) -> dict:
    if body is None:
        return {}
    if isinstance(body, dict):
        return body
    return {'_raw': str(body)[:32_768]}


def _payload_to_model_fields(payload: dict[str, Any]) -> dict[str, Any]:
    body = _normalize_body_for_json(payload.get('request_body'))
    fields = {
        'id': uuid.UUID(payload['id']),
        'application_name': payload.get('application_name', ''),
        'environment': payload.get('environment', 'Development'),
        'severity': payload.get('severity', 'ERROR'),
        'exception_type': payload.get('exception_type', ''),
        'exception_message': payload.get('exception_message', ''),
        'full_stack_trace': payload.get('full_stack_trace', ''),
        'python_file': payload.get('python_file', ''),
        'function_name': payload.get('function_name', ''),
        'class_name': payload.get('class_name', ''),
        'line_number': payload.get('line_number'),
        'source_module': payload.get('source_module', ''),
        'request_url': payload.get('request_url', ''),
        'request_method': payload.get('request_method', ''),
        'request_path': payload.get('request_path', ''),
        'query_parameters': payload.get('query_parameters') or {},
        'request_body': body,
        'http_headers': payload.get('http_headers') or {},
        'local_variables': payload.get('local_variables') or {},
        'response_status_code': payload.get('response_status_code'),
        'username': payload.get('username', ''),
        'email': payload.get('email', ''),
        'client_ip': payload.get('client_ip') or None,
        'user_agent': payload.get('user_agent', ''),
        'session_id': payload.get('session_id', ''),
        'workspace_id': payload.get('workspace_id', ''),
        'organization_id': payload.get('organization_id', ''),
        'execution_time_ms': payload.get('execution_time_ms'),
        'server_hostname': payload.get('server_hostname', ''),
        'process_id': payload.get('process_id'),
        'thread_id': payload.get('thread_id'),
        'git_commit': payload.get('git_commit', ''),
        'api_name': payload.get('api_name', ''),
        'serializer_name': payload.get('serializer_name', ''),
        'model_name': payload.get('model_name', ''),
        'view_name': payload.get('view_name', ''),
        'database_query': payload.get('database_query', ''),
        'database_error': payload.get('database_error', ''),
        'suggestion': payload.get('suggestion', ''),
        'error_category': payload.get('error_category', ''),
    }
    uid = payload.get('authenticated_user_id')
    if uid:
        fields['authenticated_user_id'] = uid
    rid = payload.get('request_id')
    if rid:
        try:
            fields['request_id'] = uuid.UUID(str(rid))
        except ValueError:
            pass
    return fields


def persist_payload(payload: dict[str, Any]) -> Optional[ErrorLog]:
    if not _enabled():
        return None
    if _is_duplicate(payload):
        return None
    try:
        return ErrorLog.objects.create(**_payload_to_model_fields(payload))
    except Exception:
        logger.exception('ErrorLog persist failed')
        return None


class ErrorLogger:
    """Plug-and-play exception logger — safe to call from anywhere."""

    @staticmethod
    def log_exception(
        exception: BaseException,
        *,
        request: HttpRequest | None = None,
        severity: str = 'ERROR',
        response_status_code: int | None = None,
        execution_time_ms: int | None = None,
        error_log_id: uuid.UUID | None = None,
        drf_context: dict[str, str] | None = None,
        async_log: bool | None = None,
    ) -> uuid.UUID | None:
        if not _enabled():
            return None

        log_id = error_log_id or uuid.uuid4()
        if request and drf_context:
            request._drf_error_context = drf_context  # noqa: SLF001

        payload = build_log_payload(
            exception,
            request=request,
            severity=severity,
            response_status_code=response_status_code,
            execution_time_ms=execution_time_ms,
            error_log_id=log_id,
        )

        use_async = _async_enabled() if async_log is None else async_log
        if use_async:
            try:
                from ..tasks import persist_error_log_task
                persist_error_log_task.delay(payload)
                return log_id
            except Exception:
                logger.debug('Async error log failed; falling back to sync', exc_info=True)

        row = persist_payload(payload)
        return uuid.UUID(payload['id']) if row else log_id

    @staticmethod
    def log_payload(payload: dict[str, Any]) -> Optional[ErrorLog]:
        return persist_payload(payload)
