# ============================================================================
#  Persist frontend error screenshots under MEDIA_ROOT (Docker: /data/media/…)
# ============================================================================
from __future__ import annotations

import base64
import binascii
import logging
import re
from pathlib import Path
from uuid import UUID

from django.conf import settings

logger = logging.getLogger(__name__)

_MAX_BYTES = 2 * 1024 * 1024  # 2 MiB PNG cap


def screenshot_dir() -> Path:
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    raw = (cfg.get('SCREENSHOT_DIR') or '').strip()
    if raw:
        path = Path(raw)
    else:
        path = Path(settings.MEDIA_ROOT) / 'error_screenshots'
    path.mkdir(parents=True, exist_ok=True)
    return path


def screenshots_enabled() -> bool:
    cfg = getattr(settings, 'ERROR_MONITORING', {}) or {}
    return bool(cfg.get('SCREENSHOT_ENABLED', True))


def _decode_png(data: str) -> bytes:
    if not data:
        return b''
    s = data.strip()
    if s.startswith('data:'):
        s = s.split(',', 1)[-1]
    s = re.sub(r'\s+', '', s)
    try:
        raw = base64.b64decode(s, validate=True)
    except (binascii.Error, ValueError):
        return b''
    if len(raw) > _MAX_BYTES:
        return b''
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        return b''
    return raw


def save_frontend_screenshot(log_id: UUID, png_base64: str) -> str:
    """Returns relative path from MEDIA_ROOT, or '' on failure."""
    if not screenshots_enabled():
        return ''
    raw = _decode_png(png_base64)
    if not raw:
        return ''
    dest_dir = screenshot_dir()
    filename = f'{log_id}.png'
    full = dest_dir / filename
    try:
        full.write_bytes(raw)
    except OSError:
        logger.exception('Failed to write error screenshot %s', full)
        return ''
    try:
        rel = full.relative_to(Path(settings.MEDIA_ROOT))
        return rel.as_posix()
    except ValueError:
        return f'error_screenshots/{filename}'
