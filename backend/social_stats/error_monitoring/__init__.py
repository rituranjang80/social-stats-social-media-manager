# ============================================================================
#  Social Stats — Global error logging & monitoring (plug-and-play module)
# ============================================================================
"""Reusable error monitoring for DRF projects.

Usage::

    from social_stats.error_monitoring.services.error_logger import ErrorLogger

    try:
        ...
    except Exception as exc:
        ErrorLogger.log_exception(exc, request=request, severity='ERROR')
        raise
"""
from __future__ import annotations

from .services.error_logger import ErrorLogger

__all__ = ['ErrorLogger']
