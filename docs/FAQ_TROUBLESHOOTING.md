# FAQ & Troubleshooting

Common problems and their fixes. See [CONFIGURATION.md](CONFIGURATION.md) for any
variable mentioned here.

## What is Social Stats, and who is it for?

Social Stats is an **open-source social media management & marketing platform**
for **agencies and in-house teams** who manage multiple brands across Facebook,
Instagram, YouTube, LinkedIn, and Google Business — plus WhatsApp Business. It
combines a post **scheduler + content calendar**, cross-platform **analytics
dashboards**, a unified **inbox**, a **click-to-WhatsApp bot builder**, an
**agency marketplace**, and an **AI assistant** (powered by Anthropic Claude).
It's **self-hostable** (Django + React) and MIT-licensed — a self-hosted
alternative to tools like Hootsuite, Buffer, and Sprout Social. See
[COMPARISON.md](COMPARISON.md).

---

## Auth & sessions

### I get signed out while I am still working
The app refreshes your JWT while you use the mouse or keyboard. If sign-out still
happens unexpectedly, check backend **`JWT_ACCESS_MIN`** (default 15) and frontend
**`REACT_APP_IDLE_TOKEN_REFRESH_MINUTES`** (default 10) — refresh should run more
often than the access token expires. See [CONFIGURATION.md](CONFIGURATION.md).

### I get signed out after leaving the desk
By default, **20 minutes** of no activity triggers a **5-minute countdown** dialog
with optional beep. Click **Continue working** to stay signed in, or adjust
`REACT_APP_IDLE_TIMEOUT_MINUTES`, `REACT_APP_IDLE_WARNING_MINUTES`, and
`REACT_APP_IDLE_SESSION_ENABLED` in `frontend/.env`. If `REACT_APP_IDLE_*_SECONDS`
is set, it overrides the matching `*_MINUTES` value. Restart the frontend after
changes. The warning does not appear while the tab is hidden or when you are
moving the mouse, typing, or clicking.

---

## Setup & runtime

### Browser shows "CORS error" on `/api/*` (oauth/status, alerts, notifications, overview, …)
The React app sends **`X-Client-Id`** and **`X-Workspace-Id`** on API calls (see
`frontend/src/services/api.js`). Browsers **preflight** those headers; if Django
does not allow them, the request fails and DevTools labels it a CORS error even
though the real issue is a failed OPTIONS check.

**Fix (backend):** `CORS_ALLOW_HEADERS` in `dashboard/settings.py` must include
`x-client-id` and `x-workspace-id` (shipped in current code). Restart the
backend container after pulling.

**Fix (deploy `.env`):** include both `localhost` and `127.0.0.1` for the UI
port when `DEBUG=False`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000
```

Use the **same host** in the address bar and in `REACT_APP_API_URL` (e.g. both
`localhost`, not `127.0.0.1` UI → `localhost` API). Hard-refresh after env
changes.

Verify preflight:

```powershell
curl.exe -X OPTIONS "http://localhost:8000/api/alerts/" ^
  -H "Origin: http://localhost:3000" ^
  -H "Access-Control-Request-Method: GET" ^
  -H "Access-Control-Request-Headers: authorization,x-client-id,x-workspace-id"
```

`Access-Control-Allow-Headers` should list `x-client-id` and `x-workspace-id`.

### Docker backend exit 127 (`bash\r: No such file or directory`) or `SOURCE_REL` warnings
**Cause:** `docker compose up` without loading `paths.env`, and/or Windows CRLF on
bind-mounted `docker/*.sh` entrypoints (shebang becomes `bash\r`).

**Fix:**
1. Prefer `.\scripts\compose-up.ps1 -Build` or
   `docker compose --env-file paths.env --env-file .env up -d --build`.
   Plain `docker compose up` now defaults `SOURCE_REL` to
   `../social-stats-social-media-manager` when unset.
2. Ensure shell scripts use **LF** (repo `.gitattributes` sets `*.sh text eol=lf`).
   Re-checkout or convert CRLF→LF, then `docker compose up -d --force-recreate backend`.
3. Orphan `frontend` container after switching away from dev compose: add
   `--remove-orphans` or use `compose-up.ps1 -Mode dev`.

### Docker backend/gateway restart loop (`pipefail` / `host not found in upstream "backend"`)
On Windows, if `social-stats-social-media-manager-start/docker/entrypoint-backend.sh`
has CRLF line endings, bash fails with `set: pipefail\r: invalid option name` or
`/usr/bin/env: 'bash\r': No such file or directory`, the backend never binds, and
the gateway crash-loops looking up `backend:8000`. Convert the script to LF (or keep
`*.sh text eol=lf` in `.gitattributes`), then
`docker compose up -d --force-recreate backend`. Backend health uses
`/api/health/services/` (not `/admin/login/`).

### How do I collapse the left feature sidebar?
On desktop, use the blue chevron tab on the edge of the Analytics/Messaging
sidebar (mid-height). Collapse/expand is remembered in the browser. Mobile uses
the hamburger drawer instead.

### How do I switch workspaces?
Use **Switch Workspace** in the **top navigation bar** (centered on desktop;
in the mobile top bar on smaller screens). The selection is global: dashboard,
composer, calendar, media, inbox, analytics, and settings all use that
workspace. Your choice persists across refresh (localStorage); it does not
log you out or refresh JWT.

### Composer / Media Library image shows 404
Uploads are stored under `SocialMediaStart/data/media/`. With `DEBUG=False`,
Django does not auto-serve them; the **gateway** must mount that folder and
serve `/media/` (Compose does this). After changing nginx/compose, rebuild and
recreate the gateway:

```powershell
cd C:\app\SocialMediaStart
docker compose --env-file .env up -d --build gateway
```

Confirm the file exists under `data/media/media_assets/...` and that
`http://localhost:8000/media/...` returns **200**.

### `/admin/clients` or `/admin/management` shows “Page not found”
Those URLs belong to the **React admin shell**, not Django. If the Docker
gateway still proxies `/admin/` to Django, you’ll see a Django 404.

- Use the React paths after restarting/rebuilding the gateway:
  - Workspaces: `/admin/clients`
  - Team RBAC: `/admin/management`
  - Composer: `/admin/analytics/composer`
- Django’s low-level admin is at **`/django-admin/`**.
- You must be signed in as **superadmin or staff** (`admin@demo.local` / `demo`
  after `demo_setup`). Client/end-user accounts are redirected away from `/admin`.

### Composer publish failed (YouTube / Instagram / etc.)
**Publish Now** returns success when the post is **queued**; actual API calls run in
Celery. If a platform rejects the post, the post status becomes **failed** or **partial**
and an **`ErrorLog`** row is created (`error_category=composer_publish`) with the
platform and message. Staff can review at **`/admin/error-logs`**. Ensure **Redis +
Celery worker** are running in Docker so publishes execute. Connect active credentials
under **Connected channels** before publishing.

If you see **`MissingSchema`** / invalid `/media/...` URL errors, set **`BACKEND_PUBLIC_URL`**
(in Docker start `.env`, default `http://backend:8000`) and confirm **`MEDIA_ROOT`** is shared
between `backend` and `celery_worker` (YouTube reads the video file from disk when possible).

### "OAuth redirect URI mismatch" when connecting an account
The redirect URI registered in the platform's developer app must match the app's
`*_REDIRECT_URI` **exactly** (scheme, host, port, path, trailing slash). The code
uses:
- Meta: `http://localhost:8000/api/oauth/facebook/callback/`
- Google (Quick Connect **and** Sign-in with Google): `http://localhost:8000/api/oauth/google/callback/`
- LinkedIn: `http://localhost:8000/api/oauth/linkedin/callback/`

Optional separate login-only URI: set `GOOGLE_SOCIAL_REDIRECT_URI` and register
`http://localhost:8000/api/auth/social/google/callback/` as a second redirect.

If Google shows *“doesn't comply with Google's OAuth 2.0 policy”* / *register the
redirect URI*, add the exact URI from the error (including trailing `/`) under
**Google Cloud Console → APIs & Services → Credentials → your OAuth client →
Authorized redirect URIs**. For local dev, also add `http://127.0.0.1:8000/api/oauth/google/callback/`
if you open the app via `127.0.0.1`. Ensure **OAuth consent screen** is configured
and your Google account is a **Test user** while the app is in Testing mode.

### Brightbean HTML 404 or missing CSS/JS
Files must live under `frontend/public/Brightbean/` and the **gateway** must be
rebuilt (`docker compose --env-file .env up -d --build gateway`). Use URLs like
`/Brightbean/NewPost.html` or `/Brightbean/YouTubeBrightbean.html`. Prefer
asset folders **without spaces** and `.js` (not `.js.download`). See
`frontend/public/Brightbean/README.txt`.

If the URL loads the **React app “Not Found”** screen instead of the HTML:
unregister the site service worker (DevTools → Application → Service Workers →
Unregister) or hard-refresh after rebuild — an older SW may have cached the SPA
shell for `/Brightbean/*`.

### YouTube Settings missing in Composer
Select a **YouTube** connected channel. The panel is lazy-loaded. After deploy,
**reconnect YouTube** so `youtube.upload` / `youtube.force-ssl` scopes apply.
Custom thumbnails require a video attached first.

### Calendar shows wrong workspace / empty
Calendar uses the global **Switch Workspace** (top bar), not a page dropdown.
Change workspace there — posts reload for that client. Create via the floating
**+** opens Composer with `scheduled_date` / `scheduled_time`.

### Where is the API Swagger?
**http://localhost:8000/api/docs/** (ReDoc: `/api/redoc/`). Click
**Authorize → passwordAuth**, enter `admin@demo.local` / `demo`. Or use
**Auth → POST /api/auth/login/** / `/api/auth/token/`. Details: [API_SWAGGER.md](API_SWAGGER.md).

### Swagger page is blank
Hard-refresh after restarting the backend. CSP must allow
`https://cdn.jsdelivr.net` and `'unsafe-inline'` on `/api/docs/`. If you still
see a blank page, check the browser console for blocked scripts.

### Connect Accounts shows "Not Configured"
On **Settings → Connect Accounts**, a platform shows **Connect** only when its
`PLATFORM_*` (or Meta/Google/LinkedIn) credentials are set in
**`C:\app\SocialMediaStart\.env`**. Empty credentials → **Not Configured**
(SS-style `is_configured`). Control the list with
`CONNECT_PLATFORMS=facebook,instagram,...`. Restart backend after `.env` edits.
See [CONFIGURATION.md](CONFIGURATION.md).

### Quick Connect gated by `OAUTH_APPS_APPROVED`
When `OAUTH_APPS_APPROVED=False`, some flows still prefer the Manual Setup
wizard. Set `OAUTH_APPS_APPROVED=True` after Meta/Google approve your OAuth apps.
See [GOING_LIVE.md](GOING_LIVE.md).

### WhatsApp webhook not verifying (403)
- The GET handshake returns `403` unless `hub.verify_token` equals
  `WHATSAPP_WEBHOOK_SECRET`.
- POST events return `403` unless the `X-Webhook-Secret` header (or `?secret=`)
  equals `WHATSAPP_WEBHOOK_SECRET`.
- Make sure `WHATSAPP_WEBHOOK_SECRET` is **set** (an empty value rejects all
  calls) and matches what you configured in Pinbot. See
  [CONNECT_WHATSAPP.md](CONNECT_WHATSAPP.md).

### Background tasks / scheduling / sync not running
Celery needs Redis and **both** a worker and beat:
```bash
celery -A dashboard worker -l info
celery -A dashboard beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
If `CELERY_BROKER_URL` can't reach Redis, scheduled publishing, metric sync, and
notification/webhook processing won't happen. Start Redis first.

### AI features do nothing / errors about the API key
Set `ANTHROPIC_API_KEY` in `backend/.env` (get one at
https://console.anthropic.com). Without it, AI surfaces (captions, replies,
insights, the Cmd/Ctrl+J assistant, AI-narrated reports) are disabled — but the
rest of the app works normally.

### Tokens expiring / "token expired" warnings
- **Google** uses `access_type=offline` + a refresh token; Social Stats
  auto-refreshes the access token. Keep the refresh token valid (don't revoke it).
- **LinkedIn** access tokens last ~60 days; the app warns 7 days before expiry —
  regenerate the token and paste it again.
- **Meta** System User Page tokens are long-lived; Graph API Explorer tokens
  expire in ~60 days, so prefer a System User token.

### `demo_setup` didn't seed any analytics
- Run `python manage.py migrate` first.
- `demo_setup` chains into `seed_demo_data` (90 days). If you passed
  `--no-metrics`, dashboards stay empty — re-run without it.
- It's idempotent; existing demo accounts keep their passwords unless you pass
  `--reset`.

### I can't log in to the demo accounts
All three use password `demo`: `admin@demo.local`, `agency@demo.local`,
`enduser@demo.local`. The `/login` page has one-click buttons for each.

### Database errors / want PostgreSQL instead of SQLite
Set `DATABASE_URL=postgres://user:pass@host:5432/dbname` (or the individual
`DB_*` vars) and re-run `python manage.py migrate`.

### Frontend can't reach the API / CORS
The React app expects the API at `http://localhost:8000` and runs on
`http://localhost:3000`. Set `FRONTEND_URL=http://localhost:3000` in
`backend/.env` for local dev, and ensure both servers are running.

### Is any data hardcoded? Will it work with my own accounts on an empty `.env`?
Yes — it's fully dynamic. Platform credentials come from env (`*_APP_ID` /
`*_CLIENT_ID`) and connected-account tokens are stored **per-tenant, encrypted,
in the database**. Demo data is synthetic and only loaded by `demo_setup` /
`seed_demo_data`; the app runs end-to-end with the demo seed off and your own
connected accounts on.
