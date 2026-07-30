# ============================================================================
#  Middleware — log unhandled exceptions (non-DRF paths / fall-through)
# ============================================================================
from __future__ import annotations

import logging
import time

from django.http import HttpRequest

from .services.error_logger import ErrorLogger

logger = logging.getLogger(__name__)


class GlobalExceptionLoggingMiddleware:
    """Captures unhandled exceptions without altering Django's handling."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        start = time.perf_counter()
        request._error_monitoring_start = start  # noqa: SLF001
        try:
            response = self.get_response(request)
            return response
        except Exception as exc:
            elapsed = int((time.perf_counter() - start) * 1000)
            if not str(getattr(request, 'path', '')).startswith('/api/'):
                ErrorLogger.log_exception(
                    exc,
                    request=request,
                    execution_time_ms=elapsed,
                )
            raise

    def process_exception(self, request: HttpRequest, exception: Exception):
        if str(getattr(request, 'path', '')).startswith('/api/'):
            return None
        start = getattr(request, '_error_monitoring_start', None)
        elapsed = None
        if start is not None:
            elapsed = int((time.perf_counter() - start) * 1000)
        ErrorLogger.log_exception(
            exception,
            request=request,
            execution_time_ms=elapsed,
        )
        return None
