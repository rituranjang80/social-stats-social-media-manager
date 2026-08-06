# Backup — Docker (scheduled) + SQLite / Postgres / media

Protect against crashes by copying **database** (SQLite or PostgreSQL) and **uploaded files** to **multiple folders** — including **UNC paths** and **mapped drives** on other PCs — keeping only the **last N days**.

All settings are in **`C:\Project2\social-stats-social-media-manager-start\.env`** (copy from `.env.example`).

## How it works

**Starting the app** with `.\scripts\compose-up.ps1` (from `social-stats-social-media-manager-start`) also starts the **backup** container when `BACKUP_ENABLED=true` in `.env` (default). No separate backup command is required.

| Piece | Role |
|--------|------|
| **`backup` service** | Docker container with **cron** (`cron -f`). Profile: `backup`. |
| **`/data` volume** | Same as backend — `db.sqlite3`, `media/`, etc. |
| **`/backups/mount1` … `mount5`** | Host paths you configure (NAS, `Z:\`, local folders). |
| **`BACKUP_DESTINATIONS`** | Semicolon list **inside the container**, e.g. `/backups/mount1;/data/backups/archive`. |
| **`BACKUP_RETENTION_DAYS`** | Deletes bundles older than N days **on each destination**. |

Each run creates `social-stats_YYYYMMDD_HHMMSS.zip` (or a folder if compression is off) with `database/`, `files/media/`, and `manifest.json`.

## 1. Configure `.env`

```env
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_DESTINATIONS=/backups/mount1;/backups/mount2;/data/backups/archive
BACKUP_CRON=0 2 * * *
BACKUP_LABEL=post4u

# Windows: map NAS to Z: first, then point mounts at host paths Docker can bind:
BACKUP_MOUNT_1_HOST=\\FILESERVER\Backups\Post4U
BACKUP_MOUNT_2_HOST=Z:\Post4U-Backups
BACKUP_MOUNT_3_HOST=./data/backups/mount3
```

**Postgres:** set `DB_NAME` (and keep `DB_HOST=postgres`). Start backup with **both** profiles:

```powershell
docker compose --env-file paths.env --env-file .env --profile postgres --profile backup up -d backup
```

**SQLite:** leave `DB_NAME` empty (default). Only `--profile backup` is required.

Inside the container, `DB_HOST` must be the **Docker service name** `postgres` (not `host.docker.internal`) for dumps.

## 2. One-shot backup (test)

```powershell
cd C:\Project2\social-stats-social-media-manager-start
.\scripts\run-backup-docker.ps1 -Once -Build
```

Dry run:

```powershell
docker compose --env-file paths.env --env-file .env --profile backup run --rm -e BACKUP_RUN_ONCE=true -e BACKUP_DRY_RUN=true backup
```

## 3. Scheduled backup (always on in Docker)

Starts automatically with **`.\scripts\compose-up.ps1`** when `BACKUP_ENABLED=true`. To disable: `BACKUP_ENABLED=false` in `.env`, then restart the stack.

Manual start (optional):

```powershell
.\scripts\run-backup-docker.ps1 -Up -Build
```

Logs:

```powershell
docker compose --env-file paths.env --env-file .env logs -f backup
```

Schedule uses **`BACKUP_CRON`** in **UTC**. Example: `0 3 * * *` = 03:00 UTC daily.

Set `BACKUP_RUN_ON_START=true` to run once when the container starts, then continue on cron.

## 4. Multiple PCs / shares

Use up to **five** mount slots:

| Env | Container path |
|-----|----------------|
| `BACKUP_MOUNT_1_HOST` | `/backups/mount1` |
| … | … |
| `BACKUP_MOUNT_5_HOST` | `/backups/mount5` |

List every target in `BACKUP_DESTINATIONS`. Unused mounts can stay as `./data/backups/mountN` (local).

**Docker Desktop on Windows:** bind-mount UNC paths only if Docker has access; mapping a **drive letter** (`Z:\...`) is often more reliable.

## 5. Restore (short)

1. Stop stack: `docker compose down` (or stop `backend` only).
2. **SQLite:** extract `database/db.sqlite3` → `./data/db.sqlite3`.
3. **Postgres:** restore `.sql` with `psql` / `pg_restore` into a fresh DB (test on staging first).
4. **Media:** extract `files/media` → `./data/media`.
5. Start stack again.

## 6. Host-only backup (optional)

Without Docker:

```powershell
python ..\social-stats-social-media-manager\scripts\run_backup.py --start-dir .
```

Use **host** paths in `BACKUP_DESTINATIONS` (e.g. `\\NAS\share;./data/backups/archive`).

---

Implementation: `social-stats-social-media-manager/scripts/backup/` (Python, stdlib + `pg_dump` in the backup image).
