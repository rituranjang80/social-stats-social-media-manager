# ============================================================================
#  Redact secrets before persisting error payloads
# ============================================================================
from __future__ import annotations

from typing import Any

from social_stats.security.audit import sanitize_log

_REDACTED = '[REDACTED]'

_SENSITIVE_HEADER_NAMES = frozenset({
    'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
    'x-api-key', 'x-auth-token', 'x-csrf-token',
})

_SENSITIVE_BODY_KEYS = frozenset({
    'password', 'token', 'secret', 'api_key', 'access', 'refresh',
    'authorization', 'backup_code', 'totp', 'client_secret',
})


def sanitize_headers(headers: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in (headers or {}).items():
        if str(key).lower() in _SENSITIVE_HEADER_NAMES:
            out[key] = _REDACTED
        else:
            out[key] = value
    return out


def sanitize_body(data: Any) -> Any:
    if data is None:
        return None
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if str(k).lower() in _SENSITIVE_BODY_KEYS:
                out[k] = _REDACTED
            else:
                out[k] = sanitize_body(v)
        return out
    if isinstance(data, (list, tuple)):
        return [sanitize_body(v) for v in data]
    if isinstance(data, str) and len(data) > 32_768:
        return data[:32_768] + '…[truncated]'
    return data


def sanitize_locals(locals_dict: dict[str, Any] | None) -> dict[str, Any]:
    if not locals_dict:
        return {}
    safe = {}
    for k, v in locals_dict.items():
        if k.startswith('_'):
            continue
        kl = str(k).lower()
        if any(p in kl for p in ('password', 'token', 'secret', 'key', 'auth')):
            safe[k] = _REDACTED
        else:
            try:
                rep = repr(v)
                if len(rep) > 512:
                    rep = rep[:512] + '…'
                safe[k] = rep
            except Exception:
                safe[k] = '<unrepr>'
    return sanitize_log(safe)
