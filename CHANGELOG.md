# Changelog

## [Unreleased]

### Fixed — Media picker z-index / drag + composer video previews

Media Library picker uses elevated modal z-index (above rails / preview toggles)
and is **draggable by the header** on desktop. Composer media-row thumbs and
platform Preview (Facebook, Instagram, YouTube, LinkedIn, …) now render video
first-frame / `file_url` previews instead of an empty stage when no thumbnail
exists. Shared `Modal` styles moved to SCSS.

### Added — Composer Media Library picker modal

Clicking **Media Library** in the composer caption card opens a reusable
`MediaPickerModal` (lazy-loaded) instead of navigating away. The dialog reuses
`MediaLibraryBody` (search, filters, upload, infinite scroll, multi-select).
Selecting assets inserts them into the composer media row (deduped), persists
via `media_urls` (`asset:<id>`) + `media_assets` IDs, and restores nested
`media_assets` when reopening a draft. Standalone Media Library page unchanged.

### Added — Media Library previews + open video in Video Studio

Media Library tiles now show the real image (`thumbnail_url` / `file_url`) and
the first frame of videos (thumbnail or muted preview seek). **Double-click** a
video navigates to Video Studio with `?asset_id=` so the clip loads for trim /
resize / thumbnail / publish. Single-click selection and bulk delete unchanged.

### Fixed — Composer / Media Library thumbnails 404 behind the gateway

Uploaded files were saved under `data/media/` but `/media/...` returned 404 when
`DEBUG=False` because Django’s `static()` helper does not register media routes
in production, and nginx was proxying `/media/` to Django. Gateway now serves
`/media/` directly from the shared media volume (`^~` so image regex rules do
not steal the path). Django also keeps an explicit `media/` serve fallback for
non-Docker runs.

### Changed — Composer form sections use reusable T-Type cards/fields

Composer (`/admin/analytics/composer` and dashboard equivalent) now wraps
platforms, title, caption, first comment, tags, notes, schedule, and AI assist
in reusable `TCard` / `TInput` / `TTextArea` primitives (SCSS modules under
`styles/scss/t/`). Desktop uses a 12-column card grid (caption + first comment,
tags + notes side-by-side). Card borders use `--border-default` so they read on
the stone page background. Save, publish, schedule, media upload, AI, and
workspace behavior are unchanged. Service worker bumped to `socialstats-v3`
(network-first for JS/CSS) so deploys are not masked by stale caches.

### Fixed — Collapsible rail sync, preview toggle top-align, composer scroll

- **Main rail:** html layout classes (`feature-sidebar-collapsed`) sync in the
  same click tick as `aria-expanded` (plus `useLayoutEffect`).
- **Preview edge toggle:** top-aligned (`top: 24px`, no `translateY(-50%)`);
  `right` bound to `--composer-preview-rail-width`.
- **Form scroll:** `.composer` / `__center` constrain height with
  `overflow: hidden`; `__form-scroll` uses `flex: 1` + `min-height: 0` so the
  form scrolls internally instead of growing the page.

Desktop `#composer-preview` can collapse to the right via a chevron edge
button (mirrors left FeatureSidebar CollapsibleRail). Form uses full width when
collapsed; state persists in localStorage. Mobile drawer Preview unchanged.
Reusable `TEdgeToggle` added for left/right rails.

CollapsibleRail z-index no longer sits above the TopBar. TopBar / `.ws-switcher`
menu stay on top; the rail wrapper uses `pointer-events: none` (children
re-enable). Layout width sync uses `useLayoutEffect` so Switch Workspace on
`/dashboard/analytics/composer` and `/admin/...` remains clickable.

### Changed — Composer Channels use reusable T-Type grid badges

Connect Channels renders via `ChannelSidebar` + `TGrid` + `TIconBadge` inside
the Analytics FeatureSidebar `.sidebar-scroll` (under **Publish**), matching
Brightbean. Composer form no longer duplicates the block; post targeting stays
on platform pills. Compact full-width SCSS:
`.channel-sidebar-module--compact` / `.composer-connect--compact`.

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
