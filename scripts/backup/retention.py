from __future__ import annotations

import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

_BUNDLE_RE = re.compile(r'^[a-zA-Z0-9_-]+_\d{8}_\d{6}(\.zip)?$')


def bundle_name(label: str, when: datetime | None = None) -> str:
    ts = when or datetime.now(timezone.utc)
    return f"{label}_{ts.strftime('%Y%m%d_%H%M%S')}"


def prune_old_backups(dest_root: Path, retention_days: int, label: str) -> list[str]:
    if retention_days <= 0 or not dest_root.is_dir():
        return []
    removed: list[str] = []
    cutoff = time.time() - (retention_days * 86400)
    prefix = f'{label}_'
    for child in dest_root.iterdir():
        if not child.name.startswith(prefix):
            continue
        if not _BUNDLE_RE.match(child.name):
            continue
        try:
            if child.stat().st_mtime >= cutoff:
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
            removed.append(child.name)
        except OSError:
            pass
    return removed
