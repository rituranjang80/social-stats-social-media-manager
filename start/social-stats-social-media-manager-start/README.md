# Social Stats — Docker & Kubernetes (config outside source)

**Run & debug (Python + React):** [RUN_AND_DEBUG.md](RUN_AND_DEBUG.md)

All runtime configuration, data, and orchestration live in this folder. The
application source stays in a separate checkout (default sibling folder
`../social-stats-social-media-manager`). **Edit code in the source tree; restart
or rely on auto-reload — no image rebuild required for Python/React changes.**

## Quick start (Docker Compose, dev)

```powershell
cd C:\Project2\social-stats-social-media-manager-start
copy paths.env.example paths.env
copy .env.example .env
# Optional: edit SOURCE_REL in paths.env if your clone is elsewhere (relative path)

.\scripts\compose-up.ps1 -Build
```

Open:

| URL | Purpose |
|-----|---------|
| http://localhost:8000 | Gateway (API + Brightbean + proxied React in dev) |
| http://localhost:3000 | React dev server (hot reload) |
| http://localhost:8001 | Django direct (bypass nginx) |

First-time DB:

```powershell
docker compose --env-file paths.env --env-file .env exec backend python manage.py demo_setup
```

## Modes

| Command | Behavior |
|---------|----------|
| `.\scripts\compose-up.ps1 -Mode dev -Build` | Django `runserver` + frontend container + nginx dev proxy |
| `.\scripts\compose-up.ps1 -Mode prod -Build` | Daphne ASGI; set `NGINX_MODE=prod` and run `npm run build` in mounted frontend |
| `.\scripts\compose-up.ps1 -Mode debug-dev -Build` | Dev + **debugpy** on port `5678` (see `.env` `WAIT_FOR_DEBUGGER`) |

Celery does not auto-reload:

```powershell
docker compose --env-file paths.env --env-file .env restart celery_worker celery_beat
```

## Configuration files

| File | Role |
|------|------|
| `paths.env` | **Relative paths** — `SOURCE_REL`, `START_REL`, `DATA_REL` |
| `.env` | Ports, Django settings, debug flags, OAuth keys, Postgres toggle |
| `data/` | SQLite DB, uploads (`media/`), collected static |

Django reads `MEDIA_ROOT`, `STATIC_ROOT`, and `SQLITE_PATH` from `.env` (mounted
into containers). Platform OAuth keys belong in `.env` here, not in the source repo.

### PostgreSQL (optional)

In `.env` set `DB_NAME=socialstats` (and user/password), then:

```powershell
docker compose --env-file paths.env --env-file .env --profile postgres up -d postgres
docker compose --env-file paths.env --env-file .env up -d backend
```

## Debug (VS Code / Cursor)

See **[RUN_AND_DEBUG.md](RUN_AND_DEBUG.md)** for debugpy attach, `launch.json`,
native venv, and React/browser debugging.
## Kubernetes (local cluster)

Build images once, then apply manifests with **hostPath** mounts to your local
source (paths resolved from `paths.env`):

```powershell
.\scripts\k8s-deploy.ps1 -BuildImages
```

Copy `k8s/base/secret.example.yaml` to `k8s/secret.yaml` and edit secrets before
deploying outside a dev machine.

Gateway is exposed as NodePort **30080**. Adjust `k8s/base/configmap.yaml` for
environment-specific settings.

## Production notes

- Use `APP_MODE=prod`, `DEBUG=False`, real `SECRET_KEY` and `FIELD_ENCRYPTION_KEYS`.
- Build the React app into `frontend/build` in the source checkout; set
  `NGINX_MODE=prod` and recreate `gateway`.
- Do not use Django `runserver` in production.

See also the main repo [docs/RUN_AND_DEBUG.md](../social-stats-social-media-manager/docs/RUN_AND_DEBUG.md), [run.md](docs/run.md), and [CONFIGURATION.md](../social-stats-social-media-manager/docs/CONFIGURATION.md).
