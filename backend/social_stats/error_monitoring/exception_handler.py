# ============================================================================
#  DRF exception handler — log + attach error_id to responses
# ============================================================================
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .constants import SEVERITY_ERROR, SEVERITY_WARNING
from .services.error_logger import ErrorLogger

logger = logging.getLogger(__name__)


def _severity_for(exc: BaseException, status_code: int) -> str:
    if isinstance(exc, APIException):
        if status_code >= 500:
            return SEVERITY_ERROR
        if status_code >= 400:
            return SEVERITY_WARNING
    return SEVERITY_ERROR


def _user_message(status_code: int, exc: BaseException) -> str:
    if status_code >= 500:
        return 'Internal Server Error'
    if isinstance(exc, APIException):
        detail = getattr(exc, 'detail', None)
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list) and detail:
            return str(detail[0])
        if isinstance(detail, dict):
            for val in detail.values():
                if isinstance(val, list) and val:
                    return str(val[0])
                return str(val)
    return 'Request could not be completed'


def _enrich_response_data(
    data: Any,
    *,
    error_id: uuid.UUID,
    status_code: int,
    message: str,
) -> dict:
    base = data if isinstance(data, dict) else {'detail': data}
    enriched = dict(base)
    enriched.setdefault('success', status_code < 400)
    enriched['error_id'] = str(error_id)
    enriched['timestamp'] = timezone.now().isoformat()
    enriched['status'] = status_code
    if status_code >= 500:
        enriched.setdefault('message', message)
    elif 'message' not in enriched and 'detail' not in enriched:
        enriched['message'] = message
    return enriched


def custom_exception_handler(exc, context):
    """Wrap DRF's handler: persist exception, return standard payload + error_id."""
    response = drf_exception_handler(exc, context)

    request = context.get('request')
    view = context.get('view')
    drf_ctx = {}
    if view:
        drf_ctx['view_name'] = view.__class__.__name__
        drf_ctx['api_name'] = getattr(view, 'action', '') or view.__class__.__name__
        get_serializer = getattr(view, 'get_serializer', None)
        if callable(get_serializer):
            try:
                serializer = get_serializer()
                drf_ctx['serializer_name'] = serializer.__class__.__name__
                meta = getattr(serializer, 'Meta', None)
                if meta and getattr(meta, 'model', None):
                    drf_ctx['model_name'] = meta.model.__name__
            except Exception:
                pass

    start = getattr(request, '_error_monitoring_start', None) if request else None
    elapsed = None
    if start is not None:
        elapsed = int((time.perf_counter() - start) * 1000)

    status_code = response.status_code if response is not None else status.HTTP_500_INTERNAL_SERVER_ERROR
    severity = _severity_for(exc, status_code)

    error_id = uuid.uuid4()
    should_log = response is None or status_code >= 400
    if should_log:
        logged_id = ErrorLogger.log_exception(
            exc,
            request=request,
            severity=severity,
            response_status_code=status_code,
            execution_time_ms=elapsed,
            error_log_id=error_id,
            drf_context=drf_ctx,
        )
        if logged_id:
            error_id = logged_id

    message = _user_message(status_code, exc)

    if response is None:
        body = _enrich_response_data(
            {'success': False, 'message': message, 'detail': message},
            error_id=error_id,
            status_code=status_code,
            message=message,
        )
        return Response(body, status=status_code)

    response.data = _enrich_response_data(
        response.data,
        error_id=error_id,
        status_code=status_code,
        message=message,
    )
    return response
