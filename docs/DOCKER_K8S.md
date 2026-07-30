# Docker & Kubernetes deployment

Runtime orchestration lives **outside this repository** in a sibling folder:

| Folder | Role |
|--------|------|
| `../social-stats-social-media-manager-start` | Compose, K8s, `.env`, `paths.env`, persistent `data/` |

Configure **relative paths** in `paths.env` (`SOURCE_REL=../social-stats-social-media-manager`)
so the same layout works on any machine. If you run plain `docker compose up` without
`--env-file paths.env`, Compose uses that same default sibling path for bind mounts.

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

## Frontend branding (`.env`)

Set `REACT_APP_BRAND_*` in the **start folder `.env`** (Docker) or `frontend/.env` (native `npm start`). Controls the product name, header logo (built-in SVG or `REACT_APP_BRAND_LOGO_URL`), favicon, and document title. Restart the frontend after changes.

| Variable | Purpose |
|----------|---------|
| `REACT_APP_BRAND_NAME` | Wordmark + aria labels |
| `REACT_APP_BRAND_LOGO_URL` | Optional image URL/path replacing the header mark SVG |
| `REACT_APP_FAVICON_URL` | Favicon (default `/icons/icon-192.png`) |
| `REACT_APP_DOCUMENT_TITLE` | Browser tab title |

See `frontend/.env.example` for the full list.
