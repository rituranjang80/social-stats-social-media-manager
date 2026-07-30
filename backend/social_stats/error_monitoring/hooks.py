# ============================================================================
#  Celery + logging hooks for non-request exceptions
# ============================================================================
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_hooks_installed = False


def install_hooks() -> None:
    global _hooks_installed
    if _hooks_installed:
        return
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    if not cfg.get('ENABLED', True):
        return

    try:
        from celery.signals import task_failure

        @task_failure.connect
        def _log_celery_failure(sender=None, task_id=None, exception=None, **kwargs):
            if exception is None:
                return
            from .services.error_logger import ErrorLogger
            ErrorLogger.log_exception(
                exception,
                severity='ERROR',
                drf_context={'api_name': getattr(sender, 'name', 'celery_task')},
            )
    except Exception:
        logger.debug('Celery task_failure hook not installed', exc_info=True)

    _hooks_installed = True
