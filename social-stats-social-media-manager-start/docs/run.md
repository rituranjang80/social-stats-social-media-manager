# Development with automatic reload

**Full run & debug guide (Python + React):** [RUN_AND_DEBUG.md](RUN_AND_DEBUG.md) in this folder, and [docs/RUN_AND_DEBUG.md](../social-stats-social-media-manager/docs/RUN_AND_DEBUG.md) in the source repo.

## Quick start

```powershell
cd ..\social-stats-social-media-manager-start
.\scripts\compose-up.ps1 -Mode dev -Build
```

Bind-mounted `backend/` reloads via Django `runserver`; the frontend container runs
`npm start` with hot reload. No backend image rebuild needed for Python edits.

```powershell
docker compose --env-file paths.env --env-file .env `
  -f docker-compose.yml -f docker-compose.dev.yml up -d --no-build backend gateway frontend
```

**Debug backend:** `.\scripts\compose-up.ps1 -Mode debug-dev -Build` then attach
debugpy to `localhost:5678` (see RUN_AND_DEBUG.md).

**Celery:** restart after task code changes:

```powershell
docker compose --env-file paths.env --env-file .env restart celery_worker celery_beat
```

Do not use the dev Compose override in production.

See also [README.md](README.md) and [../social-stats-social-media-manager/docs/DOCKER_K8S.md](../social-stats-social-media-manager/docs/DOCKER_K8S.md).
