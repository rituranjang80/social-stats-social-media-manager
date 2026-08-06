#!/usr/bin/env python3
"""Run backup from environment (Docker or host with loaded .env)."""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backup.config import BackupConfig  # noqa: E402
from backup.runner import run_backup  # noqa: E402


def _load_dotenv(start_dir: Path) -> None:
    import os
    for name in ('paths.env', '.env'):
        path = start_dir / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding='utf-8', errors='replace').splitlines():
            s = line.strip()
            if not s or s.startswith('#') or '=' not in s:
                continue
            k, _, v = s.partition('=')
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--start-dir', type=Path, default=None)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('-v', action='store_true')
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.v else logging.INFO, format='%(levelname)s %(message)s')

    start = args.start_dir
    if start:
        _load_dotenv(start.resolve())
    elif Path('/.dockerenv').exists():
        os.environ.setdefault('BACKUP_IN_DOCKER', 'true')

    cfg = BackupConfig.from_environ(start)
    try:
        result = run_backup(cfg, dry_run=args.dry_run)
    except Exception as exc:
        logging.error('%s', exc)
        return 1
    print(json.dumps(result, indent=2))
    return 0 if result.get('status') in ('ok', 'partial', 'dry_run', 'skipped') else 1


if __name__ == '__main__':
    raise SystemExit(main())
