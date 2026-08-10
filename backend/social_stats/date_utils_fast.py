"""
Load Cython-built helpers when present; otherwise pure Python (dev / CI without compile).

DRF views import from here or from modules that delegate here — behavior is identical.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_CYTHON = False

try:
    from social_stats._cython.date_utils import (  # type: ignore
        parse_publish_date_range,
        parse_since_until_dates,
    )
    _CYTHON = True
except ImportError:
    from social_stats._cython.date_utils_py import (
        parse_publish_date_range,
        parse_since_until_dates,
    )

__all__ = ['parse_publish_date_range', 'parse_since_until_dates', 'using_cython']


def using_cython() -> bool:
    return _CYTHON
