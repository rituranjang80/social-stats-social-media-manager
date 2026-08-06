from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or str(raw).strip() == '':
        return default
    return str(raw).strip().lower() in ('1', 'true', 'yes', 'on')


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or str(raw).strip() == '':
        return default
    try:
        return max(0, int(str(raw).strip()))
    except ValueError:
        return default


def _split_list(raw: str) -> list[str]:
    out: list[str] = []
    for chunk in (raw or '').replace('\n', ';').split(';'):
        p = chunk.strip()
        if p:
            out.append(p)
    return out


def _container_path(raw: str, start_dir: Path | None) -> Path:
    p = Path(raw)
    if p.is_absolute():
        return p
    base = start_dir or Path('/')
    return (base / raw).resolve()


@dataclass
class BackupConfig:
    enabled: bool
    retention_days: int
    label: str
    compress: bool
    verify: bool
    staging_dir: Path
    destinations: list[Path]
    include_sqlite: bool
    include_postgres: bool
    include_media: bool
    include_static: bool
    extra_paths: list[Path]
    sqlite_path: Path | None
    media_path: Path | None
    static_path: Path | None
    db_name: str
    db_user: str
    db_password: str
    db_host: str
    db_port: str
    docker_mode: bool

    @classmethod
    def from_environ(cls, start_dir: Path | None = None) -> BackupConfig:
        """Load from process environment (Docker injects vars; host loads .env first)."""
        start = start_dir

        staging_raw = os.environ.get('BACKUP_STAGING_DIR', '/data/backups/staging').strip()
        staging = _container_path(staging_raw, start)

        dest_raw = os.environ.get('BACKUP_DESTINATIONS', '/data/backups/archive').strip()
        destinations: list[Path] = []
        for item in _split_list(dest_raw):
            destinations.append(_container_path(item, start))

        extra: list[Path] = []
        for item in _split_list(os.environ.get('BACKUP_EXTRA_PATHS', '')):
            extra.append(_container_path(item, start))

        sqlite_raw = os.environ.get('SQLITE_PATH', '/data/db.sqlite3').strip()
        media_raw = os.environ.get('MEDIA_ROOT', '/data/media').strip()
        static_raw = os.environ.get('STATIC_ROOT', '/data/staticfiles').strip()

        sqlite_path = _container_path(sqlite_raw, start)
        media_path = _container_path(media_raw, start)
        static_path = _container_path(static_raw, start)

        db_host = os.environ.get('DB_HOST', 'postgres').strip()
        if '#' in db_host:
            db_host = db_host.split('#', 1)[0].strip()

        docker_mode = _bool('BACKUP_DOCKER_MODE', _bool('BACKUP_IN_DOCKER', False))

        return cls(
            enabled=_bool('BACKUP_ENABLED', True),
            retention_days=_int('BACKUP_RETENTION_DAYS', 14),
            label=(os.environ.get('BACKUP_LABEL', 'social-stats').strip() or 'social-stats'),
            compress=_bool('BACKUP_COMPRESS', True),
            verify=_bool('BACKUP_VERIFY', True),
            staging_dir=staging,
            destinations=destinations,
            include_sqlite=_bool('BACKUP_INCLUDE_SQLITE', True),
            include_postgres=_bool('BACKUP_INCLUDE_POSTGRES', True),
            include_media=_bool('BACKUP_INCLUDE_MEDIA', True),
            include_static=_bool('BACKUP_INCLUDE_STATICFILES', False),
            extra_paths=extra,
            sqlite_path=sqlite_path,
            media_path=media_path,
            static_path=static_path,
            db_name=os.environ.get('DB_NAME', '').strip(),
            db_user=os.environ.get('DB_USER', 'socialstats').strip(),
            db_password=os.environ.get('DB_PASSWORD', '').strip(),
            db_host=db_host,
            db_port=os.environ.get('DB_PORT', '5432').strip(),
            docker_mode=docker_mode,
        )

    def uses_postgres(self) -> bool:
        return bool(self.db_name)

    def uses_sqlite(self) -> bool:
        return not self.db_name
