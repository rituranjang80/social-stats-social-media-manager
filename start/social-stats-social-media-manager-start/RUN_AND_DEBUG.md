# Run & Debug — Python (Django) and Frontend (React)

This guide covers **daily development**: starting the stack, hot reload, and
debugging the **backend** and **frontend** without rebuilding Docker images when
you change application code.

Configuration and paths live in this folder (`paths.env`, `.env`). Application
source is bind-mounted from `SOURCE_REL` (default `../social-stats-social-media-manager`).

---

## Prerequisites

| Tool | Notes |
|------|--------|
| Docker Desktop | Engine running (Windows: Linux containers) |
| Node.js 18+ | Only if you run the frontend **on the host** instead of in Docker |
| Python 3.11+ | Only for **native** backend debugging (optional) |
| Redis | Provided by Compose (`redis` service) |

Copy config once:

```powershell
cd ..\social-stats-social-media-manager-start   # or your clone path
copy paths.env.example paths.env
copy .env.example .env
```

Edit `paths.env` if the repo is not a sibling folder:

```env
SOURCE_REL=../social-stats-social-media-manager
START_REL=.
DATA_REL=./data
```

---

## How to run (recommended: Docker dev)

### Start everything

```powershell
.\scripts\compose-up.ps1 -Mode dev -Build
```

Equivalent manual command:

```powershell
docker compose --env-file paths.env --env-file .env `
  -f docker-compose.yml -f docker-compose.dev.yml up -d --build `
  backend gateway frontend redis celery_worker celery_beat
```

### First-time database + demo users

```powershell
docker compose --env-file paths.env --env-file .env exec backend python manage.py migrate
docker compose --env-file paths.env --env-file .env exec backend python manage.py demo_setup
```

Demo logins (password `demo`): `admin@demo.local`, `agency@demo.local`, `enduser@demo.local`.

### URLs

| URL | What runs there |
|-----|-----------------|
| http://localhost:8000 | **Gateway** — `/api/*`, `/media/*`, Brightbean; in dev, `/` proxies to React |
| http://localhost:3000 | **React dev server** (hot reload for JS/SCSS) |
| http://localhost:8001 | Django **direct** (skip nginx) — useful for API-only checks |
| http://localhost:8000/api/health/services/ | Backend health (used by Compose) |
| http://localhost:8000/api/docs/ | Swagger |

### What auto-reloads

| Layer | Auto-reload? | Notes |
|-------|----------------|-------|
| Django Python | **Yes** | `runserver` in dev mode; save `.py` files under mounted `backend/` |
| React / SCSS | **Yes** | `npm start` in the frontend container (or on host) |
| Celery worker / beat | **No** | Restart after task code changes (see below) |
| nginx gateway | **No** | Recreate only when nginx templates or compose mounts change |

```powershell
docker compose --env-file paths.env --env-file .env restart celery_worker celery_beat
```

### Logs and status

```powershell
docker compose --env-file paths.env --env-file .env ps
docker compose --env-file paths.env --env-file .env logs -f backend
docker compose --env-file paths.env --env-file .env logs -f frontend
```

### Stop

```powershell
.\scripts\compose-up.ps1 -Down
# or
docker compose --env-file paths.env --env-file .env -f docker-compose.yml -f docker-compose.dev.yml down
```

---

## How to run — hybrid (backend in Docker, frontend on host)

Useful when you prefer local `npm start` (faster installs, familiar tooling).

1. Start backend stack **without** the frontend container:

```powershell
docker compose --env-file paths.env --env-file .env `
  -f docker-compose.yml -f docker-compose.dev.yml up -d backend gateway redis celery_worker celery_beat
```

2. In a second terminal:

```powershell
cd ..\social-stats-social-media-manager\frontend
$env:REACT_APP_API_URL="http://localhost:8000/api"
npm install
npm start
```

Open http://localhost:3000. Ensure `.env` in the start folder includes
`http://localhost:3000` in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.

---

## How to run — fully native (no Docker)

See the main repo [GETTING_STARTED.md](../social-stats-social-media-manager/docs/GETTING_STARTED.md):
Redis on the host, `python manage.py runserver`, and `npm start` in `frontend/`.

Use this path when debugging Python with a local venv and no containers.

---

## Debug Python (Django) — Docker + debugpy

The backend entrypoint can wrap **debugpy** around Django `runserver` (dev) or
Daphne (prod mode).

### 1. Enable debugpy

**Option A — script:**

```powershell
.\scripts\compose-up.ps1 -Mode debug-dev -Build
```

**Option B — `.env`:**

```env
ENABLE_DEBUGPY=true
WAIT_FOR_DEBUGGER=false
DEBUGPY_PORT=5678
```

Then recreate backend:

```powershell
docker compose --env-file paths.env --env-file .env `
  -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.debug.yml up -d --force-recreate backend
```

Set `WAIT_FOR_DEBUGGER=true` if the process should **pause on startup** until your IDE attaches (good for breakpoints in `manage.py` / early imports).

### 2. Attach from Cursor / VS Code

Create `.vscode/launch.json` in the **source** repo (or your user settings) with:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach Django (debugpy)",
      "type": "debugpy",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}/backend",
          "remoteRoot": "/app/backend"
        }
      ],
      "justMyCode": false
    }
  ]
}
```

Steps:

1. Start stack with debug mode (above).
2. Run **Run and Debug** → **Docker: Attach Django (debugpy)**.
3. Set breakpoints in `backend/social_stats/` (or anywhere under `backend/`).
4. Trigger the code via the UI or http://localhost:8000/api/…

Port **5678** is published in `docker-compose.yml` (`DEBUGPY_PORT` in `.env`).

### 3. Debug Python natively (venv, no Docker)

```powershell
cd ..\social-stats-social-media-manager\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install debugpy
cp .env.example .env   # edit for local Redis, etc.
```

**launch.json** (launch, not attach):

```json
{
  "name": "Native: Django runserver + debugpy",
  "type": "debugpy",
  "request": "launch",
  "program": "${workspaceFolder}/backend/manage.py",
  "args": ["runserver", "0.0.0.0:8000"],
  "django": true,
  "cwd": "${workspaceFolder}/backend",
  "env": {
    "DEBUG": "True"
  }
}
```

Run Redis locally or point `CELERY_BROKER_URL` at your Docker Redis on
`localhost:6379`.

### 4. Celery while debugging

Celery processes do **not** use debugpy by default. To debug a task:

- Use `CELERY_TASK_ALWAYS_EAGER=True` in env for synchronous task execution inside the web process (dev only), **or**
- Set breakpoints in the worker and attach a second debugpy listener (advanced; not configured out of the box).

After task code changes, restart workers:

```powershell
docker compose --env-file paths.env --env-file .env restart celery_worker celery_beat
```

---

## Debug Frontend (React)

### In Docker (default dev stack)

1. Start dev stack (`compose-up.ps1 -Mode dev`).
2. Open http://localhost:3000 in Chrome or Edge.
3. Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.
4. **Sources**: Create React App serves source maps in development — set breakpoints in DevTools under `webpack://`.
5. **Network** tab: confirm API calls go to `http://localhost:8000/api/...` when using the gateway URL in `REACT_APP_API_URL`.

Frontend container env (from start folder `.env`):

```env
REACT_APP_API_URL=http://localhost:8000/api
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

Polling helps file watching on Docker Desktop for Windows.

### On the host (`npm start`)

Same browser steps. Required env:

```powershell
$env:REACT_APP_API_URL="http://localhost:8000/api"
npm start
```

Restart `npm start` after changing any `REACT_APP_*` variable (CRA bakes them at start).

### Cursor / VS Code — Chrome debugger (optional)

With the frontend running on port 3000:

```json
{
  "name": "Chrome: React (localhost:3000)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

Requires the **Debugger for Chrome** / built-in JavaScript debugger extension.

### Common frontend issues

| Symptom | Fix |
|---------|-----|
| API 404 / CORS | Check `REACT_APP_API_URL`; ensure backend/gateway is up; verify `CORS_ALLOWED_ORIGINS` in start `.env`. If DevTools says CORS on `/api/alerts/`, `/api/overview/`, etc., confirm OPTIONS allows `x-client-id` / `x-workspace-id` (see FAQ). Use the same hostname (`localhost` vs `127.0.0.1`) for UI and API. |
| Changes not reflected | Hard refresh; for env vars, restart `npm start` or recreate `frontend` container |
| Blank page in Docker | `docker compose ... logs frontend` — wait for `Compiled successfully` |
| Old service worker | DevTools → Application → Service Workers → Unregister (see FAQ in main repo) |

---

## Debug mode quick reference

| Goal | Command / setting |
|------|-------------------|
| Normal dev | `.\scripts\compose-up.ps1 -Mode dev` |
| Python breakpoints (Docker) | `-Mode debug-dev` or `ENABLE_DEBUGPY=true` + attach port 5678 |
| Pause until debugger connects | `WAIT_FOR_DEBUGGER=true` |
| React hot reload | Dev stack + http://localhost:3000 |
| No image rebuild on code edit | Bind mounts — use `up -d --no-build` after first build |

---

## Backup (database + uploads)

Docker **scheduled** backup starts with **`.\scripts\compose-up.ps1`** when `BACKUP_ENABLED=true` (default). First time or after Dockerfile changes, use **`-Build`**:

```powershell
.\scripts\compose-up.ps1 -Build
```

One-off test (optional): `.\scripts\run-backup-docker.ps1 -Once -Build`

UNC / mapped drives: set `BACKUP_MOUNT_1_HOST`, etc., and list `/backups/mount1` in `BACKUP_DESTINATIONS`. Full guide: [docs/backup.md](docs/backup.md).

---

## Related docs

- [README.md](README.md) — Compose profiles, Postgres, Kubernetes, production
- [docs/backup.md](docs/backup.md) — retention, Postgres/SQLite, Task Scheduler
- Main repo [CONFIGURATION.md](../social-stats-social-media-manager/docs/CONFIGURATION.md) — every env var
- Main repo [FAQ_TROUBLESHOOTING.md](../social-stats-social-media-manager/docs/FAQ_TROUBLESHOOTING.md)
