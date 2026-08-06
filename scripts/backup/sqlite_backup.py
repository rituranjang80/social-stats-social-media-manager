from __future__ import annotations

import sqlite3
from pathlib import Path


def backup_sqlite(source: Path, dest_file: Path) -> None:
    dest_file.parent.mkdir(parents=True, exist_ok=True)
    if dest_file.exists():
        dest_file.unlink()
    src = sqlite3.connect(f'file:{source}?mode=ro', uri=True, timeout=120)
    try:
        dst = sqlite3.connect(str(dest_file), timeout=120)
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()
