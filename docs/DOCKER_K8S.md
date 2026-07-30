# Docker & Kubernetes deployment

Runtime orchestration lives **outside this repository** in a sibling folder:

| Folder | Role |
|--------|------|
| `../social-stats-social-media-manager-start` | Compose, K8s, `.env`, `paths.env`, persistent `data/` |

Configure **relative paths** in `paths.env` (`SOURCE_REL=../social-stats-social-media-manager`)
so the same layout works on any machine.

## Quick start

```powershell
cd ..\social-stats-social-media-manager-start
copy paths.env.example paths.env
copy .env.example .env
.\scripts\compose-up.ps1 -Mode dev -Build
docker compose --env-file paths.env --env-file .env exec backend python manage.py demo_setup
```

- **Gateway:** http://localhost:8000  
- **React (dev):** http://localhost:3000  
- **Health:** http://localhost:8000/api/health/services/

See [RUN_AND_DEBUG.md](RUN_AND_DEBUG.md) for auto-reload, debugpy, and React debugging; [README.md](../social-stats-social-media-manager-start/README.md) in the start folder for PostgreSQL, production, and Kubernetes.

## Environment variables in containers

Optional Django paths for mounted data (set in start folder `.env`):

| Variable | Purpose |
|----------|---------|
| `MEDIA_ROOT` | Uploads (default: `backend/media` in source) |
| `STATIC_ROOT` | `collectstatic` output |
| `SQLITE_PATH` | SQLite file when `DB_NAME` is unset |

OAuth and platform keys belong in the start folder `.env` — see
[CONFIGURATION.md](CONFIGURATION.md).
