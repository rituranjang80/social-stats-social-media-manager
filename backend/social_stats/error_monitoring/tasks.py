# ============================================================================
#  Async persistence for error logs
# ============================================================================
from __future__ import annotations

from celery import shared_task

from .services.error_logger import persist_payload


@shared_task(name='social_stats.error_monitoring.persist_error_log', ignore_result=True)
def persist_error_log_task(payload: dict) -> None:
    persist_payload(payload)
