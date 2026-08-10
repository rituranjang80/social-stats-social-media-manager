# Development

## Docker (recommended)

1. Set `SOURCE_REL=../social-stats-social-media-manager2` in `social-stats-social-media-manager-start/paths.env`.
2. Run:

   ```powershell
   cd C:\Project2\social-stats-social-media-manager-start\scripts
   .\compose-up.ps1
   ```

If `compose-up.ps1` fails on the **backup** profile (missing `Dockerfile.backup`), run compose without that profile or set `BACKUP_ENABLED=false` in start `.env`.

**URLs:**

- App: http://localhost:3000
- API (gateway): http://localhost:8000/api
- Frontend dev server direct: http://localhost:3000

## Local (without Docker)

Requires Node 18+ and Python 3.11+.

```powershell
cd frontend
copy ".env copy.example" .env
npm install
npm start

cd ..\backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Refactor workflow

1. Read [REFACTOR_ROADMAP.md](./REFACTOR_ROADMAP.md) for the active phase.
2. Change code only under `social-stats-social-media-manager2`.
3. Prefer module public APIs over deep imports.
4. Run tests:

   ```powershell
   docker exec social-stats-backend-1 python manage.py test social_stats.tests.test_inbox
   docker exec social-stats-frontend-1 npm test
   ```

5. Visual check Login + Composer against original app (same URLs).

## Path aliases

`frontend/jsconfig.json`:

```json
"paths": { "@app/*": ["src/*"] }
```

Use `@app/modules/...` and `@app/core/...` in new code.
