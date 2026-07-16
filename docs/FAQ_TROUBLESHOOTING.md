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

## Setup & runtime

### Docker backend/gateway restart loop (`pipefail` / `host not found in upstream "backend"`)
On Windows, if `SocialMediaStart/docker/entrypoint-backend.sh` has CRLF line
endings, bash fails with `set: pipefail\r: invalid option name`, the backend
never binds, and the gateway crash-loops looking up `backend:8000`. Convert the
script to LF (or keep `*.sh text eol=lf` in `.gitattributes`), then
`docker compose --env-file .env up -d --force-recreate`. Backend health uses
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

### "OAuth redirect URI mismatch" when connecting an account
The redirect URI registered in the platform's developer app must match the app's
`*_REDIRECT_URI` **exactly** (scheme, host, port, path, trailing slash). The code
uses:
- Meta: `http://localhost:8000/api/oauth/facebook/callback/`
- Google: `http://localhost:8000/api/oauth/google/callback/`
- LinkedIn: `http://localhost:8000/api/oauth/linkedin/callback/`

In production these must be your HTTPS domain. Update both the platform app
**and** the env var. See [CONNECT_ACCOUNTS.md](CONNECT_ACCOUNTS.md).

### Brightbean HTML 404 or missing CSS/JS
Files must live under `frontend/public/Brightbean/` and the **gateway** must be
rebuilt (`docker compose --env-file .env up -d --build gateway`). Use URLs like
`/Brightbean/NewPost.html`. Prefer asset folders **without spaces** and
`.js` (not `.js.download`). See `frontend/public/Brightbean/README.txt`.

If the URL loads the **React app “Not Found”** screen instead of the HTML:
unregister the site service worker (DevTools → Application → Service Workers →
Unregister) or hard-refresh after rebuild — an older SW may have cached the SPA
shell for `/Brightbean/*`.

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
