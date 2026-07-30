# Run & Debug — Python (Django) and Frontend (React)

Operational run/debug steps for Social Stats. **Docker configuration lives outside
this repo** in the sibling deployment folder (default name:
`social-stats-social-media-manager-start`).

> **Canonical copy:** [`../social-stats-social-media-manager-start/RUN_AND_DEBUG.md`](../social-stats-social-media-manager-start/RUN_AND_DEBUG.md)
> (same content; paths written from the start folder). Update that file when
> changing run/debug procedures, then keep this doc in sync.

---

## Prerequisites

- **Docker Desktop** running (recommended workflow)
- Optional: **Node.js 18+** and **Python 3.11+** for hybrid or fully native dev

One-time setup in the deployment folder:

```powershell
cd ..\social-stats-social-media-manager-start
copy paths.env.example paths.env
copy .env.example .env
```

Set `SOURCE_REL=../social-stats-social-media-manager` in `paths.env` (relative path
works on any machine).

---

## Run (Docker dev — recommended)

```powershell
cd ..\social-stats-social-media-manager-start
.\scripts\compose-up.ps1 -Mode dev -Build
docker compose --env-file paths.env --env-file .env exec backend python manage.py demo_setup
```

| URL | Purpose |
|-----|---------|
| http://localhost:8000 | Gateway (API + dev proxy to React) |
| http://localhost:3000 | React dev server (HMR) |
| http://localhost:8001 | Django direct |
| http://localhost:8000/api/docs/ | Swagger |

**Auto-reload:** Django (`runserver`) and React (`npm start`) reload on save.
**Celery** does not — restart `celery_worker` and `celery_beat` after task changes.

See [run.md](run.md) for compose file names and [DOCKER_K8S.md](DOCKER_K8S.md) for layout.

---

## Run — hybrid (Docker backend, host frontend)

```powershell
# Terminal 1 — start folder
docker compose --env-file paths.env --env-file .env `
  -f docker-compose.yml -f docker-compose.dev.yml up -d backend gateway redis celery_worker celery_beat

# Terminal 2 — this repo
cd frontend
$env:REACT_APP_API_URL="http://localhost:8000/api"
npm install
npm start
```

---

## Run — fully native

No Docker: [GETTING_STARTED.md](GETTING_STARTED.md) (Redis, `runserver`, `npm start`).

---

## Debug Python (Django)

### Docker + debugpy (attach)

```powershell
cd ..\social-stats-social-media-manager-start
.\scripts\compose-up.ps1 -Mode debug-dev -Build
```

In `.env`: `ENABLE_DEBUGPY=true`, optional `WAIT_FOR_DEBUGGER=true`, `DEBUGPY_PORT=5678`.

**Cursor / VS Code** — add to `.vscode/launch.json` in this repo:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach Django (debugpy)",
      "type": "debugpy",
      "request": "attach",
      "connect": { "host": "localhost", "port": 5678 },
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

Attach, then hit the API or use the UI to reach your breakpoints.

### Native venv (launch)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt debugpy
python manage.py runserver
```

Use a **launch** configuration with `"program": "${workspaceFolder}/backend/manage.py"`,
`"args": ["runserver", "0.0.0.0:8000"]`, `"django": true`.

---

## Debug Frontend (React)

### Docker dev container

1. Dev stack running → open http://localhost:3000
2. [React Developer Tools](https://react.dev/learn/react-developer-tools) extension
3. Chrome DevTools → **Sources** (`webpack://`) for breakpoints
4. **Network** tab: requests should target `http://localhost:8000/api` when
   `REACT_APP_API_URL` is set that way in the start folder `.env`

Windows + Docker: `CHOKIDAR_USEPOLLING=true` and `WATCHPACK_POLLING=true` in start `.env`.

### Host `npm start`

Restart after any `REACT_APP_*` change. Same browser tooling as above.

### Optional: launch Chrome from IDE

```json
{
  "name": "Chrome: React (localhost:3000)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

---

## Quick reference

| Task | Action |
|------|--------|
| Start dev | `compose-up.ps1 -Mode dev -Build` in start folder |
| Debug backend in Docker | `-Mode debug-dev` → attach to `localhost:5678` |
| Debug React | Browser DevTools + React extension on `:3000` |
| Celery code changed | `docker compose ... restart celery_worker celery_beat` |
| Logs | `docker compose ... logs -f backend` / `frontend` |

Troubleshooting: [FAQ_TROUBLESHOOTING.md](FAQ_TROUBLESHOOTING.md).
