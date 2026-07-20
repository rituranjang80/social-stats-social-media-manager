# Development with automatic reload

Build the Docker images once using the normal installation process. For daily
development, start Django with the development override:

```powershell
cd C:\app\SocialMediaStart
docker compose --env-file .env -f docker-compose.yml -f docker-compose.dev.yml up -d backend gateway
```

`backend/` is bind-mounted into the backend container. Django's development
server watches Python files and reloads automatically after they are saved.
No backend image rebuild is needed.

Run the React development server in a second PowerShell terminal:

```powershell
cd C:\app\SocialMedia\frontend
$env:REACT_APP_API_URL="http://localhost:8000/api"
npm start
```

Open `http://localhost:3000/admin/analytics/composer`. React and SCSS changes
refresh automatically; API requests continue to use the Docker backend on
port 8000.

Celery workers do not auto-reload. After changing tasks or other code imported
by Celery, restart them without rebuilding:

```powershell
cd C:\app\SocialMediaStart
docker compose --env-file .env restart celery_worker celery_beat
```

Useful checks:

```powershell
docker compose --env-file .env ps
docker compose --env-file .env logs -f backend
```

Do not use this development override in production because Django `runserver`
is intended only for local development.


cd C:\app\SocialMediaStart
docker compose --env-file .env -f docker-compose.yml -f docker-compose.dev.yml up -d --no-build backend gateway