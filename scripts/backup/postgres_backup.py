from __future__ import annotations

import os
import subprocess
from pathlib import Path

from .config import BackupConfig


def backup_postgres(cfg: BackupConfig, dest_sql: Path) -> None:
    dest_sql.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env['PGPASSWORD'] = cfg.db_password
    cmd = [
        'pg_dump',
        '-h', cfg.db_host,
        '-p', cfg.db_port,
        '-U', cfg.db_user,
        '-d', cfg.db_name,
        '--no-owner',
        '--no-acl',
        '-f', str(dest_sql),
    ]
    proc = subprocess.run(cmd, env=env, capture_output=True, check=False)
    if proc.returncode != 0:
        err = proc.stderr.decode('utf-8', errors='replace')
        raise RuntimeError(err or 'pg_dump failed')
