# API Swagger (OpenAPI)

Interactive docs for every Social Stats REST endpoint. Use **Try it out** with
pre-filled samples and **dropdown enums** for platforms, roles, day ranges, and
tone/length choices.

| UI | URL (Docker gateway on port 8000) |
|---|---|
| **Swagger UI** | http://localhost:8000/api/docs/ |
| ReDoc | http://localhost:8000/api/redoc/ |
| Raw OpenAPI schema | http://localhost:8000/api/schema/ |

Local `runserver` (no gateway): same paths on `http://127.0.0.1:8000/…`.

## 1. Authorize once (username + password)

1. Click **Authorize** (top of Swagger UI).
2. Under **passwordAuth (OAuth2, password)**:
   - **username:** `admin@demo.local`
   - **password:** `demo`
   - leave **client_id** / **client_secret** empty
3. Click **Authorize** → **Close**.

Swagger posts to `POST /api/auth/token/` and stores the bearer token
(`persistAuthorization`).

Alternative: **Auth → POST /api/auth/login/** (JSON body with username /
password / terms_accepted), then paste `access` into **jwtAuth**.

Demo accounts (after `python manage.py demo_setup`):

| Username | Password | Role |
|---|---|---|
| `admin@demo.local` | `demo` | superadmin |
| `demo@demo.local` | `demo` | client |

## 2. Call any API

- Expand a tag group (Auth, OAuth, Composer, AI, …).
- **Try it out** → fill path/query boxes and the **Request body** editor → **Execute**.
- Endpoints that accept JSON show **named fields** (and Examples dropdowns).
- Endpoints that need **no body** (e.g. sync-all, revert activity) omit the
  request body section — only path params.
- Path params like `client_id`: use the id from **GET /api/auth/me/** (`client_id`)
  or **GET /api/clients/**.

### Useful starter calls

| Endpoint | Notes |
|---|---|
| `GET /api/auth/me/` | Confirm JWT works |
| `GET /api/health/services/` | No auth — service health |
| `GET /api/public/lookups/` | Dropdown seed data |
| `GET /api/oauth/status/{client_id}/` | Connect catalog (`is_configured`) |
| `GET /api/oauth/google/start/{client_id}/` | Query `platform` dropdown: youtube / google_my_business / all |
| `DELETE /api/oauth/disconnect/{client_id}/{platform}/` | `platform` path is an enum dropdown |
| `POST /api/ai/compose-post/` | Sample body + tone/length/platform enums |
| `GET /api/composer/posts/` | ViewSet CRUD (serializer-driven) |

## 3. Dropdowns (enums)

Choice fields and documented path/query parameters render as **select** controls
in Swagger UI, including:

- Platform: `facebook`, `instagram`, `youtube`, `linkedin`, `google_my_business`, …
- Days lookback: `7`, `14`, `30`, `60`, `90`
- Google OAuth product: `youtube`, `google_my_business`, `all`
- AI tone / length on compose-post

ViewSets that use model `choices=` also get enum dropdowns automatically via
**drf-spectacular**.

## 4. Config

Package: `drf-spectacular` (`backend/requirements.txt`).

Wired in:

- `dashboard/settings.py` — `DEFAULT_SCHEMA_CLASS`, `SPECTACULAR_SETTINGS`
- `social_stats/urls.py` — `/api/schema/`, `/api/docs/`, `/api/redoc/`
- `social_stats/openapi.py` — tags, examples hook, JWT + API-key schemes
- `social_stats/openapi_serializers.py` — request samples + ChoiceField enums
- `security/middleware.py` — CSP exception for `/api/docs` + `/api/redoc`
  (allows Swagger CDN + inline boot script; skips `upgrade-insecure-requests`
  on plain HTTP so schema fetch does not jump to https://localhost)

After changing schema annotations, restart the backend (Docker: rebuild/restart
`backend` if requirements changed).

### Blank Swagger page?

Usually **Content-Security-Policy** blocked the CDN scripts. Hard-refresh
http://localhost:8000/api/docs/ after deploying the middleware fix. Confirm the
response CSP includes `cdn.jsdelivr.net` and `'unsafe-inline'` under `script-src`.

## 5. Security note

Schema and Swagger are **public** (`AllowAny`) so you can login from the UI.
On a public production host, put the docs behind VPN / basic auth at the reverse
proxy, or restrict path `/api/docs/` and `/api/schema/` in nginx.
