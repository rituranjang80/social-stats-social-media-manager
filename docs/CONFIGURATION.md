# Configuration Reference

Every variable in [`backend/.env.example`](../backend/.env.example), what it does,
whether it's required, how to generate it, and what breaks if it's unset.

Copy the template first:

```bash
cd backend && cp .env.example .env
```

The defaults are tuned for **local development** — you can run the app and the
demo seed with the file almost untouched. Set `ANTHROPIC_API_KEY` to enable AI,
and the platform credentials only when you want to connect real accounts.

---

## Django core

| Variable | Required | Default | What it does / how to set |
|---|---|---|---|
| `SECRET_KEY` | **Yes (prod)** | dev fallback | Django cryptographic signing key. Dev has an insecure fallback; in production set a long random value. Generate: `python -c "import secrets; print(secrets.token_urlsafe(50))"`. |
| `DEBUG` | No | `False` | `True` enables Django debug pages. **Keep `False` in production.** |
| `INBOX_DEMO_REPLY` | No | same as `DEBUG` | When `true`, inbox **Reply** on credentials whose token starts with `demo_inbox_` skips live publisher APIs (used with `python manage.py seed_inbox_demo`). |
| `ALLOWED_HOSTS` | **Yes (prod)** | `socialstats.app,www.socialstats.app` | Comma-separated hostnames Django will serve. For local dev add `localhost,127.0.0.1`. Requests to other hosts are rejected. |
| `FRONTEND_URL` | **Yes** | `https://socialstats.app` | Base URL of the React app. Used to build links in emails and OAuth redirects back to the UI. For local dev set `http://localhost:3000`. |
| `BRAND_NAME` | No | `REACT_APP_BRAND_NAME` → `Application` | Product name in **transactional emails** (client invitations, etc.). Set explicitly in `backend/.env` or mirror frontend `REACT_APP_BRAND_NAME`. |
| `BRAND_SHORT_NAME` | No | `REACT_APP_BRAND_SHORT_NAME` → brand name | Short name in email footers. |
| `BRAND_DESCRIPTION` | No | `REACT_APP_BRAND_DESCRIPTION` → empty | Tagline/blurb injected into invitation email templates. |

## Frontend branding (React `.env`)

Set in **`frontend/.env`** for native `npm start`. For **Docker dev** (`docker-compose.dev.yml`), Compose loads **`frontend/.env`** into the frontend container in addition to `social-stats-social-media-manager-start/.env`.

**Important:** Create React App reads `REACT_APP_*` when the dev server **starts**. After branding changes, from **`social-stats-social-media-manager-start`** run **`.\compose-up.ps1`** (same as `.\scripts\compose-up.ps1`; dev mode recreates the frontend container automatically). Then hard-refresh the browser. Native `npm start` on the host: stop and start `npm start` in `frontend/`.

| Variable | Required | Default (in `branding.js` only) | What it does |
|---|---|---|---|
| `REACT_APP_BRAND_NAME` | No | `Application` | Product name (header, AI labels, legal copy, notifications) |
| `REACT_APP_BRAND_SHORT_NAME` | No | same as brand name | PWA short name / `apple-mobile-web-app-title` |
| `REACT_APP_DOCUMENT_TITLE` | No | `Application` | Browser tab title (`index.html` + runtime `BrandHead`) |
| `REACT_APP_BRAND_DESCRIPTION` | No | generic platform blurb | `<meta name="description">`, marketing footer, auth hero |
| `REACT_APP_BRAND_LOGO_URL` | No | *(empty = built-in SVG mark)* | Header/sidebar logo image (path under `public/` or absolute URL) |
| `REACT_APP_FAVICON_URL` | No | `/icons/icon-192.png` | Favicon |
| `REACT_APP_APPLE_TOUCH_ICON_URL` | No | `/apple-touch-icon.png` | iOS home-screen icon |
| `REACT_APP_BRAND_PRIMARY_COLOR` | No | `#2563eb` | Primary accent; injected as `--brand-primary*` CSS variables at startup |

**Code:** import branding only from [`frontend/src/config/branding.js`](../frontend/src/config/branding.js) (or the legacy [`brand.js`](../frontend/src/config/brand.js) re-export). Do not read `process.env.REACT_APP_BRAND_*` elsewhere. Runtime manifest and theme color are updated by `BrandHead` / `installBrandingWebManifest()`.

| `REACT_APP_IDLE_SESSION_ENABLED` | No | `true` | When `false`, disables client idle sign-out and the warning dialog |
| `REACT_APP_IDLE_TIMEOUT_MINUTES` | No | `20` | Sign out after this many minutes **without** mouse/keyboard activity |
| `REACT_APP_IDLE_WARNING_MINUTES` | No | `5` | Show countdown dialog this many minutes before idle sign-out |
| `REACT_APP_IDLE_TIMEOUT_SECONDS` | No | *(unset)* | When set, overrides `REACT_APP_IDLE_TIMEOUT_MINUTES` (useful for testing) |
| `REACT_APP_IDLE_WARNING_SECONDS` | No | *(unset)* | When set, overrides `REACT_APP_IDLE_WARNING_MINUTES` |
| `REACT_APP_IDLE_BEEP` | No | `true` | Short beep when the warning opens |
| `REACT_APP_IDLE_TOKEN_REFRESH_MINUTES` | No | `10` | While you are active, refresh the JWT at most this often (keeps working sessions alive; set below backend `JWT_ACCESS_MIN`, default 15) |
| `GENERATE_SOURCEMAP` | No | `true` (CRA default) | Set **`false`** in **`frontend/.env`** for Docker dev on bind mounts to avoid **source-map-loader** read failures (`Unknown system error -61`). Dev compose sets `false` by default. |

Template: [`frontend/.env.example`](../frontend/.env.example).

## Field-level encryption

OAuth tokens and manual credentials are encrypted at rest using these keys.

| Variable | Required | Default | What it does / how to set |
|---|---|---|---|
| `FIELD_ENCRYPTION_KEYS` | **Yes (prod)** | empty | Comma-separated Fernet keys. The **first** key encrypts new writes; every key can decrypt (supports rotation). Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. |
| `FIELD_ENCRYPTION_KEY` | No | empty | Legacy single-key fallback used only if `FIELD_ENCRYPTION_KEYS` is empty. |

> If both are empty, `SECRET_KEY` is stretched into a key (dev-only fallback).
> **Production must set `FIELD_ENCRYPTION_KEYS`** — otherwise rotating `SECRET_KEY`
> would make stored tokens undecryptable. Affected fields:
> `PlatformCredential.access_token` / `refresh_token`,
> `ManualCredentialExtras.oauth_client_id` / `oauth_client_secret` / `api_key`.

## Database

| Variable | Required | Default | What it does |
|---|---|---|---|
| `DATABASE_URL` | No (dev) / **Yes (prod)** | SQLite | Full DB URL, e.g. `postgres://user:pass@host:5432/dbname`. If unset, dev uses SQLite. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | No | `postgres` / `5432` etc. | Alternative to `DATABASE_URL` — set individual Postgres connection parts. |
| `SQLITE_PATH` | No | `backend/db.sqlite3` | When `DB_NAME` is unset, path to the SQLite file (Docker: `/data/db.sqlite3`). |
| `MEDIA_ROOT` | No | `backend/media` | Filesystem root for user uploads (Docker bind-mount: `/data/media`). |
| `BACKEND_PUBLIC_URL` | No | `http://localhost:8000` | Browser-facing origin for `/media/...` in API responses (Docker: use gateway port on the host, **not** `http://backend:8000`). |
| `GATEWAY_HTTP_PORT` | No | `8000` | Used with `BACKEND_PUBLIC_URL` when unset. |
| `STATIC_ROOT` | No | `backend/staticfiles` | Target for `collectstatic` (Docker: `/data/staticfiles`). |

## CORS (browser → API)

When the React app runs on a different origin than the API (typical dev:
`http://localhost:3000` → `http://localhost:8000/api`).

| Variable | Required | Default | What it does |
|---|---|---|---|
| `CORS_ALLOWED_ORIGINS` | When `DEBUG=False` | `http://localhost:3000` | Comma-separated UI origins. Add `http://127.0.0.1:3000` if you open the app by IP name. |
| `CORS_ALLOW_ALL_ORIGINS` | No | `True` when `DEBUG=True` | Dev-only wildcard-style allow; production should use explicit origins. |

`X-Client-Id` / `X-Workspace-Id` are allowed via `CORS_ALLOW_HEADERS` in
`dashboard/settings.py` (required for most authenticated `/api/*` calls). See
[FAQ_TROUBLESHOOTING.md](FAQ_TROUBLESHOOTING.md).

## Redis / Celery

| Variable | Required | Default | What it does |
|---|---|---|---|
| `CELERY_BROKER_URL` | **Yes (for background tasks)** | `redis://localhost:6379/0` | Where Celery queues jobs. Without Redis + this, scheduled publishing, metric sync, and notifications won't run. |
| `CELERY_RESULT_BACKEND` | No | `redis://localhost:6379/0` | Where task results are stored. |

## Error monitoring

Persisted exception logging (`ErrorLog`) for API and background failures. Staff/superadmin
review in Django admin (`/django-admin/`), the React page **`/admin/error-logs`**, or REST `GET /api/errors/`.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `ERROR_MONITORING_ENABLED` | No | `True` | Master switch for capture + DRF `error_id` enrichment. |
| `ERROR_MONITORING_ASYNC` | No | `True` | Queue DB writes via Celery (`social_stats.error_monitoring.persist_error_log`). Falls back to sync if the broker is down. |
| `ERROR_MONITORING_APP_NAME` | No | `social-stats` | Stored on each row as `application_name`. |
| `ERROR_MONITORING_DEDUP_SECONDS` | No | `30` | Suppress duplicate rows with the same exception signature within this window. |
| `ERROR_MONITORING_FRONTEND_REPORT_ENABLED` | No | `True` | Accept **`POST /api/errors/client-report/`** from the React app (ErrorBoundary, `window.onerror`, unhandled rejections). |
| `ERROR_MONITORING_SCREENSHOT_ENABLED` | No | `True` | When the client sends a PNG (base64), save under the screenshot directory. |
| `ERROR_MONITORING_SCREENSHOT_DIR` | No | `{MEDIA_ROOT}/error_screenshots` | Absolute path inside the backend container. **Docker default:** `/data/media/error_screenshots` (host: `social-stats-social-media-manager-start/data/media/error_screenshots/`). Served via **`/media/error_screenshots/…`**. |
| `APP_ENV` | No | `Development` if `DEBUG=True` else `Production` | `Development` / `Staging` / `Production` label on each log. |
| `GIT_COMMIT` | No | empty | Optional deploy revision stored on each log. |

**Frontend (CRA)** — mirror in `frontend/.env`:

| Variable | Default | What it does |
|---|---|---|
| `REACT_APP_CLIENT_ERROR_REPORTING` | on (unless `false`) | POST browser/React errors to **`/api/errors/client-report/`**. |
| `REACT_APP_ERROR_SCREENSHOTS` | on (unless `false`) | Capture **`html2canvas`** PNG on each report (respects backend `ERROR_MONITORING_SCREENSHOT_*`). |

Programmatic logging from any module:

```python
from social_stats.error_monitoring import ErrorLogger

ErrorLogger.log_exception(exc, request=request, severity='ERROR')
```

**Composer publish failures** (YouTube, Instagram, Facebook, etc.): when **Publish Now** on
`/admin/analytics/composer` queues a post and a platform API call fails in the background
(`publish_to_platform` Celery task), each failure is written to `ErrorLog` with
`error_category=composer_publish`, the workspace id, platform name, and post id in
`request_body`. Staff review these at **Admin → Error logs** (`/admin/error-logs`) or Django admin.
Immediate API errors (validation, permissions) still go through the DRF handler and include
`error_id` in the JSON response when `ERROR_MONITORING` is enabled.

**Client invitation emails** (`POST /api/invitations/send/` from `/admin/clients`, `POST /api/clients/{id}/resend-invitation/`): messages use the **Welcome email template** (`GET/PUT /api/invitations/welcome-email-template/`). Branding comes from `BRAND_NAME`, `BRAND_LOGO_URL`, `FRONTEND_URL`, `SUPPORT_EMAIL`, and `SUPPORT_PHONE` (backend `.env`; mirror `REACT_APP_*` for the SPA). Accept links use `FRONTEND_URL/accept-invitation/<uuid>`. If SMTP fails or `send_mail` does not deliver, the API returns **502**, the pending invitation is rolled back, and a row is stored with `error_category=client_invitation_email`. Filter by that category on **Error logs**. Invitation tokens expire after **7 days** by default (`ClientInvitation.expires_at` on create).

**Magic accept APIs** (public): `GET /api/invitations/<uuid:token>/`, `POST /api/invitations/<uuid:token>/accept/` — return JWT on success; no password in the request body.

## Scheduled backup (Docker — `social-stats-social-media-manager-start`)

The **`backup`** Compose service (profile **`backup`**) runs **supercronic** on `BACKUP_CRON`, backs up **SQLite** or **Postgres**, **media**, optional static/extra paths, copies zip bundles to **multiple destinations** (`BACKUP_DESTINATIONS` = container paths; `BACKUP_MOUNT_1_HOST` … `_5` = host UNC / mapped drives), and prunes older than **`BACKUP_RETENTION_DAYS`**. Configure in **`social-stats-social-media-manager-start/.env`**. See **`social-stats-social-media-manager-start/docs/backup.md`**. Scripts: `run-backup-docker.ps1 -Once` / `-Up`.

| Variable | Purpose |
|---|---|
| `BACKUP_DESTINATIONS` | `;`-separated paths inside container (e.g. `/backups/mount1;/data/backups/archive`) |
| `BACKUP_MOUNT_N_HOST` | Host path bind-mounted to `/backups/mountN` |
| `BACKUP_CRON` | Cron schedule (UTC) |
| `BACKUP_DB_HOST` | Postgres hostname from backup container (default `postgres`) |

Implementation: `scripts/backup/` (Python).


API error responses include `error_id`, `timestamp`, and a safe `message` (no stack traces).

## Meta (Facebook + Instagram)

Get these from [developers.facebook.com](https://developers.facebook.com) → Create
App (Business type) → add **Pages API** + **Instagram Graph API**. See
[CONNECT_ACCOUNTS.md](CONNECT_ACCOUNTS.md).

| Variable | Required | Default | What it does |
|---|---|---|---|
| `META_APP_ID` | For Quick Connect | placeholder | Meta App ID (Settings → Basic). |
| `META_APP_SECRET` | For Quick Connect | placeholder | Meta App Secret. |
| `META_REDIRECT_URI` | For Quick Connect | `http://localhost:8000/api/oauth/facebook/callback/` | Must match the redirect URI registered in the Meta app exactly. |

## Google (YouTube + Google Business Profile)

Get these from [console.cloud.google.com](https://console.cloud.google.com) →
enable **YouTube Data API v3**, **YouTube Analytics API**, **Business Profile API**.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | For Quick Connect | placeholder | OAuth 2.0 Web Application client ID (ends `.apps.googleusercontent.com`). |
| `GOOGLE_CLIENT_SECRET` | For Quick Connect | placeholder | OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | For Quick Connect | `http://localhost:8000/api/oauth/google/callback/` | Must match the Authorized redirect URI in Google Cloud exactly. |
| `GOOGLE_SOCIAL_REDIRECT_URI` | No | same as `GOOGLE_REDIRECT_URI` | Sign-in with Google on `/login`. Defaults to `GOOGLE_REDIRECT_URI` so one redirect URI is enough locally. |

## LinkedIn

Get these from [linkedin.com/developers](https://www.linkedin.com/developers).

| Variable | Required | Default | What it does |
|---|---|---|---|
| `LINKEDIN_CLIENT_ID` | For Quick Connect | placeholder | LinkedIn app client ID (Auth tab). |
| `LINKEDIN_CLIENT_SECRET` | For Quick Connect | placeholder | LinkedIn app client secret. |
| `LINKEDIN_REDIRECT_URI` | For Quick Connect | `http://localhost:8000/api/oauth/linkedin/callback/` | Must match the redirect URI in the LinkedIn app exactly. |

## Connect Accounts catalog (Settings → Connect)

When deploying via **social-stats-social-media-manager-start** (or legacy
**SocialMediaStart**), put these in that folder's `.env`
(not inside the source tree). Restart backend after changes:
`docker compose --env-file paths.env --env-file .env up -d`.

`is_configured` on `/dashboard/settings` matches the SS connect page: a platform
shows **Connect** when its app credentials are non-empty in `.env`; otherwise it
shows **Not Configured** (not a hardcoded “Coming soon” list).

| Variable | Required | Default | What it does |
|---|---|---|---|
| `CONNECT_PLATFORMS` | No | full catalog list | Comma-separated platform ids shown on Connect Accounts. Example: `facebook,instagram,youtube,linkedin,google_my_business`. |
| `PLATFORM_<ID>_ENABLED` | No | unset (enabled) | Kill-switch, e.g. `PLATFORM_TIKTOK_ENABLED=false` hides TikTok. |
| `PLATFORM_FACEBOOK_APP_ID` / `SECRET` | For Meta | empty | Also accepted as `META_APP_ID` / `META_APP_SECRET`. Configures Facebook, Instagram, Threads. |
| `PLATFORM_INSTAGRAM_APP_ID` / `SECRET` | Optional | empty | Instagram Login card. |
| `PLATFORM_GOOGLE_CLIENT_ID` / `SECRET` | For Google | empty | YouTube + Google Business. |
| `PLATFORM_LINKEDIN_*_CLIENT_ID` / `SECRET` | For LinkedIn | empty | LinkedIn / personal / company cards. |
| `PLATFORM_TIKTOK_CLIENT_KEY` / `SECRET` | Optional | empty | TikTok card → Connect when set (Quick Connect handler may still be limited). |
| `PLATFORM_PINTEREST_APP_ID` / `SECRET` | Optional | empty | Pinterest. |
| `PLATFORM_TWITTER_CLIENT_ID` / `SECRET` | Optional | empty | X (Twitter). |

API: `GET /api/oauth/status/<client_id>/` returns `{ platforms, catalog }` where each
connected platform includes `account_name`, `avatar_url` (page/channel profile photo
from the social network, cached on `PlatformCredential.account_picture_url`), plus
catalog rows with `is_configured`, `connectable`, and link `status`.

## Email

| Variable | Required | Default | What it does |
|---|---|---|---|
| `EMAIL_HOST` | For email | `smtp.gmail.com` | SMTP host for report/notification emails. |
| `EMAIL_PORT` | For email | `587` | SMTP port. |
| `EMAIL_HOST_USER` | For email | placeholder | SMTP username. For Gmail, enable 2FA → App Passwords. |
| `EMAIL_HOST_PASSWORD` | For email | placeholder | SMTP password / Gmail App Password. |
| `DEFAULT_FROM_EMAIL` | No | `Social Stats <noreply@socialstats.app>` | From address on outgoing email. |

> Without email config, the app still runs; email-dependent features (report
> delivery, some notifications) simply won't send.

## Anthropic (AI features)

| Variable | Required | Default | What it does |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | For AI | placeholder | Powers AI captions, replies, insights, the Cmd/Ctrl+J assistant, and AI-narrated reports. Get one at [console.anthropic.com](https://console.anthropic.com). **Without it, AI surfaces are disabled; everything else works.** |

## WhatsApp (Pinbot Partners API v3)

See [CONNECT_WHATSAPP.md](CONNECT_WHATSAPP.md) for the full setup.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `PINBOT_BASE_URL` | For WhatsApp | `https://partnersv1.pinbot.ai/v3` | Pinbot Partners API base URL. |
| `WHATSAPP_ENCRYPTION_KEY` | For WhatsApp | empty | Fernet key encrypting WhatsApp credentials at rest. Generate like `FIELD_ENCRYPTION_KEYS`. |
| `WHATSAPP_WEBHOOK_SECRET` | For WhatsApp | empty | Random 32+ char string. Verifies inbound webhook calls to `/api/whatsapp/webhook/` (sent as `X-Webhook-Secret` header, or matched as `hub.verify_token` on the GET handshake). |
| `WHATSAPP_RATE_LIMIT_PER_SEC` | No | `20` | Outbound WhatsApp send rate cap. |

## Quick Connect toggle

| Variable | Required | Default | What it does |
|---|---|---|---|
| `OAUTH_APPS_APPROVED` | No | `False` | Prefer `True` once Meta/Google/LinkedIn approve your apps. `False` keeps Manual Setup as the fallback path. Per-platform **Connect** vs **Not Configured** is driven by `PLATFORM_*` credentials (see Connect Accounts catalog above), not this flag alone. |

---

## Advanced / optional (read from `settings.py`, not in `.env.example`)

These have working defaults and rarely need changing:

| Variable | Default | What it does |
|---|---|---|
| `AXES_FAILURE_LIMIT` | `5` | Failed logins before lockout (django-axes). |
| `AXES_COOLOFF_HOURS` | `1` | Lockout duration in hours. |
| `JWT_ACCESS_MIN` | `15` | Access-token lifetime (minutes). |
| `JWT_REFRESH_DAYS` | `7` | Refresh-token lifetime (days). Refresh tokens **rotate** on each `POST /api/auth/refresh/`; the SPA must save the new `refresh` value from the response (handled in `frontend/src/services/api.js`). |
| `JWT_AUDIENCE` / `JWT_ISSUER` | `socialstats-app` / `socialstats.com` | JWT claims. |
| `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` | `Lax` | Cookie SameSite policy. |
| `FACEBOOK_SOCIAL_APP_ID` / `FACEBOOK_SOCIAL_APP_SECRET` | falls back to `META_APP_ID` / `META_APP_SECRET` | App credentials for "Sign in with Facebook" (app login, separate from connecting a Page). |
| `AI_MONTHLY_BUDGET_USD` | `500` | Monthly AI spend cap. |
| `AI_PER_CLIENT_DAILY_LIMIT` | `100` | Per-client daily AI request cap. |
| `AI_DEFAULT_MODEL` | `claude-sonnet-4-6` | Default Claude model. |
| `AI_FAST_MODEL` | `claude-haiku-4-5-20251001` | Fast/cheap model for light tasks. |
| `AI_DEEP_MODEL` | `claude-opus-4-7` | Highest-capability model for deep tasks. |
| *(schema)* **`ClientPageConfig.show_post_management`** | `True` | Per-client flag: Analytics → **Post Management** and `GET /api/post-management/*`. Toggle via Account settings or Management portal config. Migration **`0072_post_management_feature`**. |
| *(schema)* **`PostManagementStatusChange`** | — | Audit rows for status updates (comment, actor, from/to). Migration **`0074_post_management_status_change`**. **`PATCH …/posts/<id>/status/`** requires **`comment`**. **`GET /api/post-management/status-log/`** needs **`post_management.view_status_log`**. |
