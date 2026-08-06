from __future__ import annotations

import json
import logging
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .config import BackupConfig
from .files_backup import copy_tree, dir_size
from .postgres_backup import backup_postgres
from .publish import copy_to_destinations
from .retention import bundle_name, prune_old_backups
from .sqlite_backup import backup_sqlite

logger = logging.getLogger(__name__)


def _zip_dir(folder: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for file in folder.rglob('*'):
            if file.is_file():
                zf.write(file, file.relative_to(folder))


def run_backup(cfg: BackupConfig, *, dry_run: bool = False) -> dict:
    if not cfg.enabled:
        return {'status': 'skipped', 'reason': 'BACKUP_ENABLED=false'}
    if not cfg.destinations:
        raise RuntimeError('BACKUP_DESTINATIONS is empty.')

    now = datetime.now(timezone.utc)
    name = bundle_name(cfg.label, now)
    cfg.staging_dir.mkdir(parents=True, exist_ok=True)
    bundle_dir = cfg.staging_dir / name

    if dry_run:
        return {
            'status': 'dry_run',
            'bundle': str(bundle_dir),
            'destinations': [str(d) for d in cfg.destinations],
            'retention_days': cfg.retention_days,
            'sqlite': str(cfg.sqlite_path),
            'postgres': cfg.db_name or None,
        }

    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
    bundle_dir.mkdir(parents=True)

    manifest: dict = {
        'label': cfg.label,
        'created_at': now.isoformat(),
        'components': [],
    }
    errors: list[str] = []

    if cfg.include_sqlite and cfg.uses_sqlite():
        if cfg.sqlite_path and cfg.sqlite_path.is_file():
            dest_db = bundle_dir / 'database' / 'db.sqlite3'
            try:
                backup_sqlite(cfg.sqlite_path, dest_db)
                manifest['components'].append({'type': 'sqlite', 'bytes': dest_db.stat().st_size})
            except Exception as exc:
                errors.append(f'SQLite: {exc}')
                logger.exception('sqlite backup')
        else:
            errors.append(f'SQLite not found: {cfg.sqlite_path}')

    if cfg.include_postgres and cfg.uses_postgres():
        dest_sql = bundle_dir / 'database' / f'{cfg.db_name}.sql'
        try:
            backup_postgres(cfg, dest_sql)
            manifest['components'].append({'type': 'postgres', 'bytes': dest_sql.stat().st_size})
        except Exception as exc:
            errors.append(f'Postgres: {exc}')
            logger.exception('postgres backup')

    if cfg.include_media and cfg.media_path and cfg.media_path.is_dir():
        dest = bundle_dir / 'files' / 'media'
        copy_tree(cfg.media_path, dest)
        manifest['components'].append({'type': 'media', 'bytes': dir_size(dest)})

    if cfg.include_static and cfg.static_path and cfg.static_path.is_dir():
        dest = bundle_dir / 'files' / 'staticfiles'
        copy_tree(cfg.static_path, dest)
        manifest['components'].append({'type': 'staticfiles', 'bytes': dir_size(dest)})

    for idx, extra in enumerate(cfg.extra_paths):
        if not extra.exists():
            errors.append(f'Missing extra path: {extra}')
            continue
        dest = bundle_dir / 'files' / f'extra_{idx}_{extra.name}'
        if extra.is_dir():
            copy_tree(extra, dest)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(extra, dest)
        manifest['components'].append({'type': 'extra', 'source': str(extra)})

    if not manifest['components']:
        shutil.rmtree(bundle_dir)
        raise RuntimeError('Nothing backed up. ' + '; '.join(errors))

    manifest['errors'] = errors
    (bundle_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    publish = bundle_dir
    if cfg.compress:
        zip_path = cfg.staging_dir / f'{name}.zip'
        _zip_dir(bundle_dir, zip_path)
        if cfg.verify and not zipfile.is_zipfile(zip_path):
            raise RuntimeError('Zip verify failed')
        shutil.rmtree(bundle_dir)
        publish = zip_path

    copied = copy_to_destinations(publish, cfg.destinations)
    pruned = {str(d): prune_old_backups(d, cfg.retention_days, cfg.label) for d in cfg.destinations}
    prune_old_backups(cfg.staging_dir, cfg.retention_days, cfg.label)

    return {
        'status': 'ok' if not errors else 'partial',
        'bundle': str(publish),
        'copied_to': copied,
        'pruned': pruned,
        'errors': errors,
    }
