# Changelog

## [Unreleased]

### Added — Optional Cython build for DRF date helpers

- **`backend/scripts/build_cython.py`** compiles pure helper modules listed in **`cython_manifest.json`** (starts with **`date_utils.pyx`**). DRF views stay Python; **`date_utils_fast`** uses compiled code when present and pure Python otherwise so API behavior is unchanged. See **`docs/CYTHON.md`**.

### Added — Full application themes (Appearance)

- **Settings → Appearance → Theme** (`#settings-appearance-mode`): **Light**, **Dark**, **System**, plus **seven** full themes (**Ocean**, **Violet**, **Emerald**, **Sunset**, **Rose**, **Indigo**, **Midnight**). One click applies the whole UI via `<html data-theme="…">` (same mechanism as Light/Dark). Stored in `localStorage` key `theme`.

### Changed — Refactor Phase 2 (manager2 API split)

- **`frontend/src/core/api/*`**: domain API modules extracted from the monolithic `services/api.js`; **`services/api.js`** is now a thin re-export barrel so existing imports keep working. No endpoint or payload changes.

### Added — Refactor foundation (manager2)

- **New codebase** at `social-stats-social-media-manager2` (source app unchanged). Architecture audit, module registry, `@app/core/*` and `@app/modules/*` public facades, `jsconfig` path aliases, and Docker instructions via `SOURCE_REL=../social-stats-social-media-manager2`. See `docs/REFACTOR_ROADMAP.md`.

### Added — Inbox date range, channel toolbar, API sync

- **Analytics → Inbox** loads **`Conversation`** / **`Message`** rows from the database only, filtered by **date range** (`since`/`until`), **connected channel** multi-select (same **`ConnectedChannelFilter`** as Calendar), type/sentiment/unread/starred, and search.
- Reusable **`WorkspaceChannelToolbar`** (date + channels + sync) shared with **Analytics** metrics page.
- **`POST /api/inbox/sync/`** queues Celery inbox pulls for the active workspace (optional `platforms` array). Configure default range via **`REACT_APP_INBOX_DEFAULT_DAYS`** in `frontend/.env`.

### Added — Inbox demo sample data

- **`python manage.py seed_inbox_demo`** — creates **`demo-inbox-*`** conversations (comments, DMs, mentions, reviews) across platforms with varied sentiment, unread/starred/resolved/archived states, and optional **`demo_inbox_seed`** credentials for local replies. Use **`--replace`** to refresh. With **`INBOX_DEMO_REPLY=true`** (default when **`DEBUG=true`**), replies on demo credentials persist outbound messages without calling social APIs.

### Fixed — Analytics dev build (source-map-loader)

- **Analytics** page no longer imports the large **`calendar.scss`** bundle (filter row uses inline layout; channel control keeps **`channel-selector`** styles). Docker dev defaults **`GENERATE_SOURCEMAP=false`** to avoid **`Unknown system error -61`** from **source-map-loader** on bind-mounted volumes.

### Added — Analytics workspace scope + social filters

- **Admin Analytics** (`/admin/analytics/analytics`): use the top bar **Switch workspace → All workspaces** for combined metrics across every workspace, or pick one workspace for per-client charts. Removed duplicate client/platform dropdowns; **social channel filter** matches **Analytics → Calendar** (connected accounts from the database / OAuth). **Sync data** queues API sync (`POST /admin/sync-all/` or per-client `trigger_sync`) so charts reflect stored **`DailyMetric`** rows; **Connect accounts** links appear when OAuth is missing.

### Added — Frontend error logging + screenshots

- **`POST /api/errors/client-report/`** persists React **`ErrorBoundary`**, **`window.onerror`**, and **unhandled rejection** events into **`ErrorLog`** (`error_category=frontend`). Optional **PNG screenshot** saved under **`ERROR_MONITORING_SCREENSHOT_DIR`** (Docker: **`/data/media/error_screenshots`**, host **`data/media/error_screenshots/`**). Staff view rows and images at **`/admin/error-logs`**. Env: **`ERROR_MONITORING_FRONTEND_REPORT_ENABLED`**, **`ERROR_MONITORING_SCREENSHOT_*`**, **`REACT_APP_CLIENT_ERROR_REPORTING`**, **`REACT_APP_ERROR_SCREENSHOTS`**.

### Added — Post Management status audit

- **Status changes** on Post Management require a **comment**; each change is stored in **`PostManagementStatusChange`** (who, when, from/to status, comment). Also written to the workspace **Activity** feed (`post_management.status_change`).
- **RBAC:** **`post_management.view_status_log`** — see comments and changer on post cards + **`GET /api/post-management/status-log/`** for export/analysis. Grant on **Management → Permissions** (staff/client). Existing **`post_management.change_status`** is required to update status. Migration **`0074_post_management_status_change`**.

### Added — Post Management module

- **Analytics → Post Management** (`/admin/analytics/post-management`): defaults **today → +1 month**, status filters **Pending Review** + **On Hold**; card layout refresh; composer links open in new tabs.
- **RBAC** (Team & permissions): `post_management.view`, `post_management.change_status`, `post_management.configure` seeded in the **`Permission`** table.
- **Workspace toggle**: **`ClientPageConfig.show_post_management`** — enable/disable in **Account settings → Workspace features** or **Management → Portal config**. API: **`GET/PUT /api/post-management/settings/`**, **`GET /api/post-management/posts/`**, **`PATCH /api/post-management/posts/<id>/status/`** (403 when disabled).

### Fixed — Sudden logout (~15 min) with valid session

- **JWT refresh rotation**: the API blacklists the old refresh token on each refresh (`ROTATE_REFRESH_TOKENS`). The SPA now **stores the new `refresh` token** from `POST /api/auth/refresh/` (401 handler, idle refresh, and app bootstrap). Previously only `access` was updated, so the next refresh failed and cleared the session (`NotAuthenticated`).

- **List mode only**: removed calendar **month nav / Today / view / List badge**; added **From–To** date range (default **today minus 1 month → today**). Posts load via **`date_from` / `date_to`** on **`GET /api/composer/posts/`** and **`GET /api/calendar/posts/`** (`publish_list_dates` helper). URL: `?mode=list&from=YYYY-MM-DD&to=YYYY-MM-DD` (replaces `year`/`month` for list).

- **List mode** no longer hides behind the calendar **posts loading** spinner; **Queue / Drafts / Sent** and **Approvals** render while posts load.
- **List mode toolbar** matches calendar mode (**month nav**, **Today**, **view**, **status / channel / tag / search** filters) plus a **List** badge; **status legend** checkboxes show on both modes.
- **`PublishCalendarConfigProvider`** loads **`list_tabs`** and **`approval_pills`** from **`GET /api/calendar/post-statuses/`** with retry UI when the API fails.

- **`?mode=list`** uses the same **status / channel / tag / search** toolbar as calendar mode; filtered posts flow into **Queue**, **Drafts**, and **Sent**, and into **Approvals** (composer list respects the same filters).
- **GET `/api/calendar/post-statuses/`** now also returns **`list_tabs`** and **`approval_pills`** (labels + `match` status values intersected with **UnifiedPost** / **CalendarPost** DB enums). The UI no longer hardcodes tab or pill definitions in the frontend.

- **All Posts / All Channels / All Tags** master rows now **toggle off every child** when unchecked and **turn all children on** when checked (including indeterminate → all). Status filters use the same id list as **`GET /api/calendar/post-statuses/`**. Filter checkboxes use a **custom box** so **unchecked** rows show an empty square (native controlled checkboxes could stay visually checked).

- Restored **`calendarAPI.getPosts`** on **`frontend/src/services/api.js`** (hook called a missing method, so loads failed and the grid stayed empty). Calendar list API now resolves **`client_id`** UUIDs via **`resolve_client_pk`**.

- **List mode** loads **composer posts across all months** (not only the toolbar month). **Calendar mode** still scopes the grid to the visible month — use **Prev/Next** or URL **`?year=2026&month=10`** for October–December demo seeds.

- **`python manage.py seed_calendar_status_posts`** — creates **4 composer posts per DB status** with anchor dates in **October–December** (after September), tagged `calendar-demo-seed`, for Publish calendar / list / approvals QA. Options: `--client=<uuid|pk>`, `--year=2026`, `--replace`, `--legacy-calendar`.

### Added — Publish list approvals (Brightbean)

- **List mode** on **Analytics → Calendar** (`?mode=list&view=agenda`): **Queue**, **Drafts**, **Approvals**, and **Sent** tabs (URL `tab=queue|drafts|approvals|sent`). **Approvals** matches the Brightbean workflow: status pills, per-post **Approve** / **Reject**, bulk actions, and **Edit** in Composer.
- **GET `/api/calendar/post-statuses/`** drives the toolbar status filter from **UnifiedPost** and **CalendarPost** DB choice values (with Brightbean-style filter labels).

### Fixed — App shell crash on load

- Restored **`buildShellModules`** export in **`FeatureSidebar.jsx`** so **`AppShell`** can build the module list again (`TypeError: buildShellModules is not a function`).

### Added — Calendar post detail dock

- **Analytics → Calendar**: each post chip has a **checkbox**. When checked, the same **action toolbar** as hover (`bb-cal__card-actions` — Edit, Preview, etc.) appears **fixed at the bottom center** of the screen (like the **New post** FAB) via a **body portal**, so it **does not scroll** with the grid. Uncheck or **×** to dismiss.

- **Analytics → Calendar**: composer **drafts without a schedule** appear on the day they were **created** (`created_at`). The status legend uses **checkboxes** (including **All Posts**) to filter what shows on the grid; layout margins are tighter so the month view scrolls with less empty space.

- **Week / Day** views place posts in the correct **time slot** (including drafts on `created_at`), use the same **compact chips** and **hover tooltips** as month view, and show a hover **+** on each slot to create a post at that date/time.

### Changed — Content calendar (Publish)

- **Analytics → Calendar** (`/admin/analytics/calendar`): status filter is a **searchable multi-select** (checkboxes) with All Posts, Draft, Pending Review, Pending Client, Approved, Changes Requested, Rejected, Scheduled, Publishing, Published, Failed, and On Hold. A **color legend** stays visible while the grid scrolls; month cells show **platform icon**, **title**, and **time** tinted by status.

### Added — Global Interactive Dialog

- **`DialogHost`** (in `App.js`) and **`frontend/src/services/dialog.js`**: call **`showDialog`**, **`confirmDialog`**, **`alertDialog`**, or **`promptDialog`** from any screen instead of `window.alert`, `confirm`, or `prompt`. Typed themes (info, success, error, warning, delete, publish, etc.), backdrop blur, focus trap, Esc/Enter, and mobile sheet layout. Styles live in **`styles/scss/ui/_interactive-dialog.scss`** (theme variables only).
- **Analytics → Queues**: deleting a queue uses the delete confirmation dialog; API and behavior unchanged.

### Fixed — Admin composer approval queue (500)

- **`GET /api/composer/approvals/`** no longer crashes when the frontend sends the workspace **public UUID** as `client_id` (admin API interceptor). Count is computed **before** slicing the queryset. Tenant scoping now matches **TenantScopedMixin** (staff assigned clients, agency-managed workspaces, superadmin optional workspace filter).

### Fixed — Composer create with workspace UUID

- **`POST /api/composer/posts/`** (and related composer serializers) no longer reject `client` / `client_id` when the UI sends the workspace **public UUID** string. `client` is **read-only** on composer serializers; the server stamps `client_id` from **`TenantScopedMixin`** / `resolve_client_pk` (query, body, or `X-Client-Id` header).

### Changed — Post queue schedule UI

- **Analytics → Queues** (`/admin/analytics/queues`): the **New queue** dialog uses **When to post** (every day, weekdays, weekends, specific days, or advanced cron) plus a **time picker** and plain-language summary. **Specific days** and **Custom cron** stay selected (no snap-back to weekdays). The API still stores a standard cron string in `schedule_rule`.

### Changed — Composer connected channels UI

- **Connected channels** show **social account profile images** (page/channel photo from Facebook, Instagram, YouTube, LinkedIn, etc.) like tools such as Postiz, loaded via **`PlatformCredential.account_picture_url`** (migration **`0070_platformcredential_account_picture_url`**) and **`GET /api/oauth/status/`** (`avatar_url`). Composer cards use a **checkbox**, **round profile photo**, **small platform icon** badge, and **account name** — not the signed-in user’s app avatar.

### Added — Docker scheduled backup (SQLite / Postgres + files)

- **`scripts/backup/`** Python toolkit: online SQLite backup, `pg_dump`, media/static/extra paths, zip bundles, multi-destination copy, N-day retention.
- **`social-stats-social-media-manager-start`**: Compose **`backup`** service (profile `backup`, **supercronic**), `Dockerfile.backup`, `run-backup-docker.ps1`, `docs/backup.md`, `BACKUP_*` / `BACKUP_MOUNT_*` in `.env.example`. **`compose-up.ps1`** enables profile **`backup`** when `BACKUP_ENABLED=true` so backup runs with the app.

### Fixed — Accept invitation magic link auto-login

- **`POST /api/invitations/<token>/accept/`** no longer sends a stale browser JWT (avoids **401** before the public accept handler runs). Accept page stores tokens and uses a **full navigation** to `/dashboard` (fixes React Strict Mode leaving the page stuck on “Accepting…”). Audit/notification failures no longer block accept.

### Added — Client invitation & welcome email

- **Invitation emails** use a branded HTML wrapper (company logo + name from `BRAND_*` / `FRONTEND_URL`) and **separate URLs** for **Accept invitation** (`/accept-invitation/<token>`) and **Login** (`/login`). **No temporary passwords** are sent in email.
- **Magic accept**: `GET /api/invitations/<token>/`, `POST /api/invitations/<token>/accept/` validates a single-use token, issues JWT, marks the invitation accepted, and expires the link after first use. Expired links show an **Invitation expired** page; staff can **Resend** from `/admin/clients`.
- **Welcome email template** moved to **Admin → Account settings → Welcome email template** (`/admin/account-settings/welcome-email-template`) with rich editor, preview, save, and reset default (`GET/PUT /api/invitations/welcome-email-template/`). Removed from the Clients page.
- **Client list actions** (Edit, Resend invitation, Activate/Deactivate, Delete with confirm, Open workspace, Sync). Soft delete via `Client.is_deleted`. Audit events: invitation sent/resent/accepted, client activated/deactivated/deleted.
- Backend migration **`0069_client_invitation_welcome_email`**: `Client.is_deleted`, `Client.last_invitation_sent_at`, `ClientInvitation.token_used_at`. **`POST /api/clients/{id}/resend-invitation/`**, **`activate`**, **`deactivate`**.

### Changed — Client invitation emails (supersedes prior Unreleased bullets)

- Replaced temp-password provisioning in invitation mail with **secure token links** only. Email delivery failure still returns **502**, rolls back the pending invitation, and logs **`client_invitation_email`** to Error logs. The Clients page **auto-refreshes** invitation status every 12s (and on tab focus).

### Changed — Admin workspace switcher

- On **`/admin`** (staff / superadmin), **Switch workspace** in the top bar opens a **search** field, filterable workspace list, and **New workspace** → `/admin/clients` (existing Clients page unchanged). Non-admin shells keep the prior behavior (dropdown only when multiple workspaces exist).

### Added — Top bar profile photo

- When a user has a **profile photo** (Settings → Profile), the top bar account control shows the image with a ring and `object-fit: cover`; otherwise initials are unchanged. `/auth/me/` now exposes `avatar` (and `name`) from `UserProfile.avatar`.

### Changed — Top bar chrome

- Fixed **Sass build error** in `topbar.scss` (stray `}` from a bad merge).
- Top bar uses a light **frosted** background, grouped **quick actions** (theme, notifications, What’s new), a divider, and a polished **account dropdown** (animation, separator before sign out, focus rings). Breadcrumb segments link again when navigable.

### Fixed — Docker could not load `frontend/.env`

- **`paths.env`** for the in-repo start layout uses **`SOURCE_REL=..`** so Compose mounts the correct `frontend/` tree and **`frontend/.env`** branding vars apply.

### Changed — Branding env refresh via `compose-up.ps1`

- Dev **`scripts/compose-up.ps1`** (and root **`compose-up.ps1`**) force-recreates the **frontend** container so **`frontend/.env`** / **`REACT_APP_*`** apply without a separate `docker compose restart`. Docs point to **`.\compose-up.ps1`** after branding edits.

### Fixed — Brand name still showing old product name in UI

- Sidebar rail title (`RailHeader` **h2**) and login wordmark use **`BRAND_NAME`** from env (analytics module no longer snapshots `brand.name` at module load). Docker dev compose loads **`frontend/.env`** for the frontend service. **Restart the frontend** after editing `REACT_APP_BRAND_*`.

### Fixed — AI assistant floating trigger

- Restored missing **`AIChatPanel`** import in **`AIFloatingTrigger`** (fixes `ReferenceError: AIChatPanel is not defined`).

### Fixed — Login page crash

- Restored missing **`SkipLink`** import in **`AuthLayout`** (fixes `ReferenceError: SkipLink is not defined` on `/login`).

### Added — Centralized frontend branding (`config/branding.js`)

- All **`REACT_APP_BRAND_*`** values are read only in **`frontend/src/config/branding.js`** (legacy **`brand.js`** re-export). Components use **`BRAND_NAME`**, **`DOCUMENT_TITLE`**, **`BRAND_LOGO_URL`**, helpers, and runtime **`BrandHead`** / PWA manifest install for white-label deploys.

### Changed — Frontend white-label branding

- Replaced user-facing **Social Stats** / **Marketing OS** copy across `frontend/src` with `config/branding` helpers (`BRAND_NAME`, `titleWithBrandSuffix`, AI labels, etc.) so deploys can rebrand via `REACT_APP_BRAND_*` without code edits.
- Marketing **inline `#00CCF5`** accents in `pages/marketing/*.jsx` and `components/marketing/*.jsx` now use **`var(--brand-primary)`** / **`var(--brand-primary-hover)`** where they represent the primary brand color.

### Fixed — Video / media upload with workspace UUID

- **Video Studio** (`POST /api/video/upload/` and related video endpoints) and **AI** function views resolve `client_id` / `client` / `X-Client-Id` as **`public_id` UUID** or legacy integer (shared `resolve_request_client`). Fixes `Field 'id' expected a number but got '{uuid}'` on `/admin/analytics/video` and media flows that share the same headers.
- **TenantScopedMixin** superadmin list filters resolve UUID `?client_id=` to internal pk (Media Library and composer media).

### Fixed — API 404 after workspace UUID in URLs

- OAuth connect, disconnect, ROI, GMB, and manual connect routes accept **`public_id` UUID** (not only integer paths). Fixes Django “tried these URL patterns” when opening `/api/oauth/.../start/{uuid}/`.

### Added — Workspace `public_id` (UUID) in URLs

- Each **Client** workspace has a stable **`public_id`** (migration `0067_client_public_id`). Admin routes use `/admin/client/{uuid}/settings` instead of sequential numeric ids. API `client_id` / `X-Client-Id` accept UUID or legacy integer.

### Changed — Composer Connect accounts

- **Connect accounts** on `/admin/analytics/composer` navigates to the **current workspace** Connect Accounts page (`/admin/client/{public_id}/settings`), not `/admin/settings`.

### Fixed — Idle session warning while user is active

- Activity now includes **mouse movement** (throttled), **click/input/focus**, and any interaction **closes** the warning. Idle time **pauses** when the browser tab is hidden; the dialog only shows when the tab is visible.
- Configurable idle sign-out (env vars, **Continue working**, JWT refresh while active). Restart frontend after `.env` changes; dev console logs `[idle-session]` timings.

### Changed — Desktop navigation shell

- Retired the **64px module rail** UI; **Modules** (Analytics, Messaging, Ads), feature sections, and **Account** actions now live in the **collapsible feature sidebar**. Layout uses sidebar width only (no extra left gutter).

### Fixed — Edge rail toggle (TEdgeToggle)

- Restored normal icon size and removed misplaced `t1-collapsible-rail-root` on the button so the left sidebar and composer preview toggles are **clickable** and **top-aligned** below the top bar.

### Changed — Composer live preview video

- **Double-click** the video in the right **Preview** panel (`#composer-preview`): with **YouTube** selected, opens **Custom Thumbnail** and starts playback (same as **Play** in that dialog); otherwise plays inline with controls.

### Fixed — Media URLs missing gateway port (`http://localhost/media` → `:8000`)

- API and UI now rewrite bare `http://localhost/media/...` to **`http://localhost:8000/media/...`**
  when the app runs on port 3000 and the gateway is on 8000.
- Nginx forwards **`Host: $http_host`** so new API responses include the correct port.

### Fixed — Docker media previews (Media Library / Video Studio)

- Gateway **proxies `/media/` to Django** so files under `data/media/` on the host match what the API serves (no stale nginx-only alias path).
- **`BACKEND_PUBLIC_URL=http://localhost:8000`** for browser-facing media URLs (not `backend:8000`).
- Frontend rewrites internal Docker hostnames; **`setupProxy.js`** proxies `/media` when using `npm start` on port 3000.

### Fixed — Media Library & Video Studio previews

- **`file_url` / `thumbnail_url`** from the API are now absolute URLs (gateway-friendly).
- Frontend **`resolveMediaUrl`** maps any remaining `/media/...` paths using `REACT_APP_API_URL`.
- Grid thumbnails/videos preview again; **double-click video** opens Video Studio with playback in the player panel.

### Fixed — Composer YouTube publish (`MissingSchema` on `/media/...`)

- Relative media paths like `/media/media_assets/...` are resolved before publish:
  **YouTube** reads the file from shared `MEDIA_ROOT` in Celery when present; other platforms get an
  absolute URL via **`BACKEND_PUBLIC_URL`** (default `http://backend:8000` in Docker Compose).

### Added — Composer publish → ErrorLog

- Failed platform publishes (YouTube, Instagram, etc.) after **Publish Now** on the composer are
  persisted to **`ErrorLog`** (`error_category=composer_publish`) with post id, workspace, and platform.
- Synchronous publish API errors surface **`error_id`** in the toast when the backend returns one.

### Changed — Composer preview & form scroll

- Live preview rail **starts collapsed** on desktop by default (toggle remains visible).
- Preview edge toggle grows taller when expanded for easier clicking.
- Composer form area shows a **visible scrollbar**; click the form background and use **arrow / Page Up / Down** keys to scroll.

### Fixed — Google Sign-in redirect URI (OAuth policy error)

Sign-in with Google now defaults to **`GOOGLE_REDIRECT_URI`**
(`/api/oauth/google/callback/`) so the same Authorized redirect URI used for
YouTube/GMB connect works on `/login`. The shared callback dispatches social login
when `social_state` is present or when OAuth `state` is a social-login token (fixes
HTTP 500 when the session cookie was missing on callback).

### Added — Global error monitoring (DRF)

Backend module `social_stats/error_monitoring/` captures unhandled and API
exceptions into `ErrorLog` (UUID id), with DRF `error_id` on error responses,
staff APIs at `/api/errors/`, Django admin export/resolve, async Celery persist,
deduplication, and redaction of secrets. Staff UI at `/admin/error-logs`. Configure via `ERROR_MONITORING_*` env
vars — see `docs/CONFIGURATION.md`.

### Fixed — Login UI ignores MFA (`mfa_required` from `/api/auth/login/`)

When MFA is enabled, the API returns `mfa_required` and a short-lived
`mfa_token` instead of JWTs. The login page now shows a second step for the
authenticator or backup code and completes sign-in via `/api/auth/mfa/login/`.

### Fixed — Docker Compose on Windows (exit 127 / exit 2, blank `SOURCE_REL`)

- **`social-stats-social-media-manager-start`:** `SOURCE_REL` defaults in
  `docker-compose.yml` when `paths.env` is not passed on the CLI; backend
  entrypoint invokes `/bin/bash` explicitly.
- Shell entrypoints under `docker/` converted to LF (CRLF caused
  `/usr/bin/env: 'bash\r': No such file or directory` and exit code 127).
- **`scripts/normalize-shell-lf.ps1`** runs automatically from **`compose-up.ps1`**
  so Windows CRLF on bind-mounted `*.sh` entrypoints does not recur.

### Added — Frontend branding via `.env` only

Product name, header logo mark (built-in SVG or `REACT_APP_BRAND_LOGO_URL`), favicon,
and document title are driven by `REACT_APP_BRAND_*` in `frontend/.env` or the
start-folder `.env`. See `frontend/src/config/brand.js` and `frontend/.env.example`.

### Fixed — API "CORS error" from workspace headers (alerts, oauth/status, overview, …)

Browsers preflight `X-Client-Id` and `X-Workspace-Id` from `frontend/src/services/api.js`.
Django now lists them in `CORS_ALLOW_HEADERS`. Deployment `.env` examples include
`127.0.0.1` UI origins alongside `localhost`.

### Fixed — Docker dev stack on Windows (CRLF, nginx, Celery)

- Shell entrypoints use LF line endings; frontend entrypoint is bind-mounted like backend.
- Gateway nginx templates moved off `/etc/nginx/templates/` to avoid duplicate envsubst.
- Celery worker/beat use `bash -c` so commands run correctly under Compose.

### Added — Run & debug documentation (Python + React)

- **`social-stats-social-media-manager-start/RUN_AND_DEBUG.md`** — how to run Docker
  dev/hybrid/native stacks, attach **debugpy** to Django, and debug the React app
  (DevTools, env vars, Celery restarts).
- **`docs/RUN_AND_DEBUG.md`** — same workflows from the source repo perspective.
- **`.vscode/launch.json.example`** — attach/l launch configs for Docker debugpy,
  native Django, and Chrome.

### Added — External Docker & Kubernetes deployment (`social-stats-social-media-manager-start`)

New sibling folder layout runs the app with **config and data outside the source
tree**: bind-mounted backend/frontend code (no image rebuild on edits), dev
auto-reload, optional **debugpy**, Compose + Kubernetes manifests, and
`paths.env` relative paths (`SOURCE_REL`, `DATA_REL`) for different machines.
Django accepts optional `MEDIA_ROOT`, `STATIC_ROOT`, and `SQLITE_PATH` env vars
for container data volumes.

### Added — Local backend auto-reload workflow

The development Compose override runs Django's development server against the
existing bind-mounted backend source, so saved Python changes reload without an
image build. Development CORS/CSRF settings allow the React hot-reload server on
port 3000; Celery services still require a restart after task-code changes.

### Fixed — Composer preview no longer hardcodes Facebook/Instagram

New Composer drafts start with no platform selected. Preview tabs are now
created only from the connected channels the user selects; the previous
hardcoded Facebook/Instagram defaults and fallback Facebook tab were removed.
With no selection, Preview shows a Select a channel empty state.

### Changed — Composer usability, responsive layout, and accessibility

Composer now groups content, publishing, team details, and AI assistance into
clear responsive sections with an 8px spacing rhythm, sticky workspace/status
header, compact mobile actions, and improved loading skeleton. Connected
channels have a first-run Connect Accounts action; captions show per-platform
character guidance and media upload progress; attached media can be replaced
through the existing Media Library. Scheduling displays the detected timezone,
clarifies the existing queue workflow, and links back to Calendar after a
successful schedule. Preview tabs support arrow/Home/End keyboard navigation,
tag controls no longer nest buttons, validation/preflight use live regions,
and reduced-motion preferences are respected. Existing Composer payloads,
REST endpoints, permissions, publishing, scheduling, drafts, and routing are
unchanged.

### Fixed — Calendar filters, All semantics, and Composer posts on grid

Publish calendar channel/tag dropdowns were clipped by `overflow` on the toolbar
shell (looked empty). Channels load from OAuth status (avatar, platform icon,
name, handle) with post-platform fallback; tags from `tag_suggestions` plus
hashtags/tags on loaded posts. Empty selection = **All Channels** / **All Tags**
(no restriction). Month data merges legacy `CalendarPost` with Composer
`UnifiedPost` rows for the workspace so scheduled composer posts appear by
default. Channel/tag filters run client-side (no extra refetch per toggle).
Cards show thumbnail, platforms, time, status, and tags. DnD reschedule routes
composer posts through the existing schedule API.

### Changed — Calendar hover create + connected channel/tag filters

Month view is the default (current month). Date-cell **+** appears only on
hover (top-right fade/scale), then opens Composer with that date + workspace.
Channel filter lists **connected** OAuth accounts (avatar, platform icon, name,
handle; multi-select + search). Tags load from `tag_suggestions` with search /
select-all / clear. New reusable pieces: `CalendarMonthView`,
`CalendarDateCell`, `HoverCreateButton`, `ConnectedChannelFilter`,
`TagFilterDropdown`.

### Changed — Analytics Calendar matches BrightBean Publish UI

Calendar (`/admin|dashboard/analytics/calendar`) redesigned to the BrightBean
Publish/Calendar chrome (stone/orange, List↔Calendar toggle, toolbar filters,
month grid). Adds week/day/agenda views, status/channel/tag/search filters,
summary stats, drag-and-drop reschedule (existing `reschedule` API), floating
**+** / cell **+** that open Composer with `scheduled_date`, `scheduled_time`,
and workspace. Uses global Switch Workspace (no per-page client dropdown).
Existing drawers, notes, and CalendarPost APIs unchanged. Reference:
`/Brightbean/NewPost.html`.

### Added — Composer YouTube Settings + custom thumbnail creator

When a YouTube channel is selected in Composer, a **YouTube Settings** panel
appears (Brightbean-aligned accordions): title/description overrides, tags,
category, playlist, language, recording details, visibility (public / unlisted /
private / schedule + premiere flag), audience (Made for Kids, age restriction),
license, distribution, comments preferences, advanced flags, and metadata.
**Custom Thumbnail** opens a lazy-loaded dialog (play/seek/frame capture, 16:9
overlay, upload, Use Thumbnail) that stores a media asset on the draft without
changing the main media row. Settings persist in `platform_overrides.youtube`
(draft save/restore, schedule, edit). Publish/orchestrator passes supported
fields to `YouTubePublisher` (privacy, tags, category, kids, thumb, schedule,
license, embed, notify, playlist, languages, recording, altered content).
YouTube OAuth scopes now include `youtube.upload` + `youtube.force-ssl` —
reconnect YouTube after deploy. Reference UI: `/Brightbean/YouTubeBrightbean.html`.

### Fixed — Brightbean YouTube prototype 404 on gateway

`YouTubeBrightbean.html` (+ `YouTubeBrightbean_files/`) under
`frontend/public/Brightbean/` was missing from the built gateway image, so
http://localhost:8000/Brightbean/YouTubeBrightbean.html returned nginx 404.
Asset scripts renamed from `.js.download` to `.js`. Rebuild gateway after
adding Brightbean HTML. See `frontend/public/Brightbean/README.txt`.

### Changed — Composer connected channels card UI

Composer “Connected channels” replaces the old platform pills with reusable
Brightbean-style cards (`ChannelSelector` / `ChannelCard` / `ChannelGrid`,
plus `ChannelAvatar`, `SocialIcon`, `StatusBadge`). Cards load live workspace
accounts from `/oauth/status` and now render **connected accounts only**.
Cards show the logged-in user profile image (or initials fallback), platform
icon, account name, handle, workspace chip, and connected status. Selection
still toggles `targetPlatforms` — publish, schedule, preview, and save are
unchanged.

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
