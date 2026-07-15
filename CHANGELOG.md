# Changelog

## [Unreleased]

### Fixed — Docker stack crash-loop on Windows (entrypoint CRLF)

`entrypoint-backend.sh` with CRLF prevented bash `set -o pipefail`, so
backend/celery never started and nginx failed with `host not found in upstream
"backend:8000"`. Scripts enforce LF; backend healthcheck now probes
`/api/health/services/`.

### Changed — Global Switch Workspace in the top navigation bar

Workspace selection is centralized in the app **TopBar** (and mobile top bar)
via `WorkspaceSwitcher` + `useWorkspace`, synced to `appStore`
(`currentClientId` / `currentClient`, localStorage). Axios now attaches
`client_id` (and `X-Client-Id`) on requests automatically. Switching workspace
invalidates React Query and remounts the main outlet so modules refetch for the
new Client. Composer and the admin sidebar no longer host their own switchers.

### Changed — Composer: no page-local Multi-workspace & Teams chrome

Composer page drops org breadcrumb, team rail, RBAC/invites capability cards,
and “Manage workspaces” links. Workspace selection moved to the **global top
bar** (see above). Saves, drafts, schedule, publish, duplicate params, media
upload, preflight, tags, and AI calls use the active workspace from
`appStore` / axios (`client` / `client_id`). Tenant mixin also accepts
`client_id` in the request body (backward compatible). Removed unused composer
tenant components/hook and the page-local workspace switcher.

### Changed — Composer shell components + closer Brightbean match

Post composer UI further aligned with `/Brightbean/NewPost.html`: Create header
with bordered back control, platform pills without card chrome, caption card
footer (Media Library + char count), empty preview state, orange brand action
buttons, Cmd/Ctrl+S draft shortcut. Extracted reusable presentational pieces
(`ComposerHeader`, `ComposerCaptionEditor`, `ComposerScheduleCard`,
`ComposerActionFooter`, `ComposerPreviewPanel`) — **no API or state-logic
regressions**.

### Changed — Composer UI matches Brightbean Create look

React composer (`/admin/analytics/composer` and dashboard equivalent) restyled to
align with Brightbean `NewPost.html`: warm stone page surface, orange primary
actions, Create/Edit header with back, account-style platform pills, caption
card with inline media, uppercase section labels, entrance motion, and live
preview panel polish. **Logic unchanged** (save/publish/schedule/preflight/AI/
upload/tenant/connect). Brightbean tokens are scoped under `.composer` so the
global cyan brand tokens stay intact elsewhere.

### Fixed — Brightbean URL showed React “Not Found”

A production service worker had cached the SPA `index.html` under
`/Brightbean/NewPost.html`, so the browser showed the React 404 instead of the
static HTML. `sw.js` now **bypasses** `/Brightbean/*` (and uses network-first
for navigations); cache bumped to `socialstats-v2`.

### Added — Static Brightbean HTML at `/Brightbean/*`

Serve prototype pages from `frontend/public/Brightbean/` at
http://localhost:8000/Brightbean/NewPost.html (also any `a.html` / `b.html` you
add). Gateway nginx `location ^~ /Brightbean/` returns real files (no SPA
fallback). Assets live in `NewPost_files/` (no spaces); `.js.download` → `.js`.
Rebuild gateway after changes. Notes: `frontend/public/Brightbean/README.txt`.

### Added — Interactive Swagger / OpenAPI (`/api/docs/`)

- **drf-spectacular** with Swagger UI, ReDoc, and raw schema:
  http://localhost:8000/api/docs/ · `/api/redoc/` · `/api/schema/`
- Try it out enabled by default; JWT **Authorize** (persistAuthorization).
- Sample request bodies (login demo users, signup, AI compose, token refresh)
  selectable from the Examples dropdown.
- Enum / ChoiceField parameters surface as **dropdowns** (platform, days,
  Google OAuth product, AI tone/length, disconnect platform path).
- Tag groups: Auth, OAuth, Composer, Calendar, Inbox, AI, WhatsApp, …
- Guide: [docs/API_SWAGGER.md](docs/API_SWAGGER.md).

### Fixed — Swagger missing input boxes + username/password Authorize

- Password fields marked `format: password` in the OpenAPI schema.
- **Authorize → passwordAuth**: username/password login via new
  `POST /api/auth/token/` (OAuth2 password grant for Swagger UI).
  Demo: `admin@demo.local` / `demo`.

### Fixed — Swagger no longer shows empty `{}` request bodies

Removed the catch-all empty-object body. Named request schemas + examples for
admin/activity/AI write APIs (create-client, dispute resolve, verification
approve/reject, flag activity, compose/rewrite/…). POSTs that take no body
(`sync-all`, `revert`) declare `request=None` so Swagger hides the body editor.

### Fixed — Swagger UI blank page under CSP / HTTP localhost

`/api/docs/` rendered an empty shell because `SecurityHeadersMiddleware` set
`script-src 'self'` (blocking jsDelivr Swagger assets + inline boot JS) and
`upgrade-insecure-requests` (schema fetch upgraded to `https://localhost` and
failed). Docs/ReDoc responses now use a relaxed CSP without that upgrade flag
on plain HTTP.

### Fixed — Connect Accounts driven by SocialMediaStart `.env` (not “Coming soon”)

Settings → Connect Accounts previously labelled most networks **Coming soon /
Not configured** via hardcoded frontend flags. Behaviour now matches SS
`social-accounts/.../connect/`:

- **Configured** = non-empty `PLATFORM_*` credentials in
  `C:\app\SocialMediaStart\.env` (via Django `PLATFORM_CREDENTIALS_FROM_ENV`).
- **Connect** button when `is_configured` + Quick Connect handler exists
  (Facebook/IG/Threads → Meta; YouTube/GMB → Google; LinkedIn variants → LinkedIn).
- **Not Configured** when env credentials are empty.
- Catalog visibility: `CONNECT_PLATFORMS=...` and optional
  `PLATFORM_<ID>_ENABLED=false`.
- `GET /api/oauth/status/<client_id>/` returns `{ platforms, catalog }`.

Docs: `docs/CONFIGURATION.md`, FAQ, User Guide. Examples updated in
`SocialMediaStart/.env.example`.

### Added — Full social connect catalog on Settings (icons + check/unchecked)

Redesigned `/dashboard/settings` **Connect Accounts** (and composer Connect
channels) after the SS social-accounts connect pattern:

- Shared catalog `constants/socialPlatforms.js` + backend
  `platform_catalog.py` listing Facebook, Instagram (+ Login), LinkedIn
  (+ personal/company), TikTok, YouTube, Pinterest, Threads, Bluesky, Google
  Business, Mastodon, X/Twitter.
- Brand icons via expanded `SocialPlatformIcon`.
- Check / unchecked indicators (`TPlatformCheck`) on every platform card.
- Reusable `TSocialConnectCard` (SCSS, no inline styles).
- Live OAuth unchanged for the five credential platforms; others show as
  unchecked **Coming soon / Not configured** without breaking APIs.
- `GET /api/oauth/status/<client_id>/` now returns the full catalog
  (`oauth_enabled` flag on each entry).

### Fixed — React `/admin/*` routes 404 behind Docker gateway

The gateway nginx config proxied **all** of `/admin/` to Django’s admin site,
so the React admin shell paths (`/admin/clients`, `/admin/management`,
`/admin/analytics/composer`, etc.) returned Django “Page not found”.

- SPA `/admin/*` now served by the React app (`try_files` → `index.html`).
- Django admin moved to **`/django-admin/`** (backend + gateway).

### Added — Composer Multi-workspace layout & publishing extras

Redesigned `/dashboard/analytics/composer` (and `/admin/.../composer`) with a
**Multi-workspace & Teams** layout inspired by Organization → Workspace →
Members, without changing existing publish/schedule APIs beyond additive fields.

**UI / UX**
- Left rail: Organization → Workspace → Members hierarchy, workspace switcher
  (when multiple Clients exist), Connect Channels status, and Access links
  (RBAC, roles, invitations, client collaborator).
- Header tenant breadcrumb (`ComposerTenantBar`) showing org → workspace → role.
- First comment, internal tags, and internal notes on the compose form.
- Live preview shows first-comment preview when applicable.
- SCSS modular composer styles (`frontend/src/styles/scss/composer/`) and
  reusable T-Type primitives (`frontend/src/components/t/`).

**Backend (additive, backward compatible)**
- `UnifiedPost` fields: `first_comment`, `tags` (JSON list), `internal_notes`
  — migration `0065_unifiedpost_first_comment_tags`.
- Serializer + `GET /api/composer/posts/tag_suggestions/`.
- After successful publish, optional first comment via Facebook / Instagram /
  LinkedIn publishers (`post_comment_on_post`).

**Frontend modules**
- `useComposerTenant` — loads Agency (org), Client (workspace), invites/staff
  counts from existing APIs.
- Components: `ComposerConnectChannels`, `ComposerFirstComment`, `ComposerTags`,
  `ComposerWorkspaceRail`, `ComposerTenantBar`.

### Changed — Social Stats is now free & open source (MIT)

Payments and paid plans were removed; the product is free and self-hostable
under the MIT License (Copyright © 2026 Chandrabhan Shekhawat — Gigai Kripa
Services).

**Removed**
- Razorpay billing integration: checkout/confirm/cancel/invoice/webhook
  endpoints (`billing_views.py`) and their routes; the Razorpay healthcheck.
- Frontend Pricing page, Agency/End-user billing pages, Refund Policy page, the
  billing API client, pricing teasers, and the Razorpay integration card.
- "Billing"/"Agency billing" navigation entries and the billing notification
  event.

**Changed**
- All plan quotas are now unlimited for both account types (`end_user` and
  `agency_member`); `usage_limits` checks always allow. Role separation
  (end-user vs agency vs superadmin) is unchanged.
- Legal pages drop the payment processor (Razorpay) from sub-processor/cookie
  lists; the operator is now "Gigai Kripa Services".

**Database (legacy / unused)**
- The billing models (`Subscription`, `Invoice`) and **all historical
  migrations are kept as-is** — no tables were dropped. These tables are now
  **unused/legacy** inert storage; the app still `migrate`s cleanly from an
  empty database. Migration `0064_rename_gateway_fields` renames the former
  `razorpay_*` columns to neutral `gateway_*` names (a pure column rename — no
  data loss). They may be removed in a future migration if desired.
