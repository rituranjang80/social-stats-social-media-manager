"""Pure-Python fallback for date_utils (same API as date_utils.pyx)."""
from __future__ import annotations

from datetime import date, timedelta


def _parse_iso(raw):
    if raw is None:
        return None
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def parse_publish_date_range(date_from_str, date_to_str):
    start = _parse_iso(date_from_str)
    end = _parse_iso(date_to_str)
    if start and end and start > end:
        start, end = end, start
    if start and not end:
        end = start
    if end and not start:
        start = end
    return start, end


def parse_since_until_dates(since_str, until_str, default_days=30):
    today = date.today()
    since = _parse_iso(since_str)
    until = _parse_iso(until_str)
    if since is None:
        since = today - timedelta(days=default_days)
    if until is None:
        until = today
    if since > until:
        since, until = until, since
    return since, until
