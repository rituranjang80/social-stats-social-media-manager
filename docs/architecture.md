# Architecture audit & target design

**Source (read-only reference):** `C:\Project2\social-stats-social-media-manager`  
**Refactor workspace:** `C:\Project2\social-stats-social-media-manager2`  
**Audit date:** 2026-08-10

## Executive summary

The application is a **Django + DRF** backend with a **Create React App** frontend, deployed via **Docker Compose** (`social-stats-social-media-manager-start`). Business logic spans a large Django app (`social_stats`), a monolithic `frontend/src/services/api.js`, and feature pages (Composer ~800+ LOC, Calendar, Inbox, Analytics). Some **modular patterns already exist** (route modules `AnalyticsModule`, `publishers` registry, `TenantScopedMixin`, Zustand workspace store, React Query).

The refactor goal is **not a redesign**: extract **public module interfaces** and **core layers** while keeping URLs, APIs, auth, RBAC, and visual parity—especially **`/login`** and **`/admin/analytics/composer`**.

---

## Frontend (current state)

| Layer | Location | Notes |
|-------|----------|--------|
| Entry / routing | `src/App.js`, `src/modules/*Module.jsx` | Lazy route shells for Analytics, Messaging, Ads |
| Pages | `src/pages/**` | Feature-heavy; Composer in `pages/composer/ComposerPage.jsx` |
| Components | `src/components/**` | Partial design system under `components/ui/` |
| Hooks | `src/hooks/**` | `useAuth`, `useWorkspace`, `useComposer`, data hooks |
| State | `src/stores/appStore.js`, React Query | Workspace persisted; server state in Query |
| API | `src/services/api.js` | Single axios instance + domain API objects |
| Config | `src/config/branding.js`, `inbox.js`, `brand.js` | Env-driven branding |
| Styles | `src/styles/scss/**` | SCSS tokens + feature SCSS; **no Tailwind in package.json** |
| Realtime | `hooks/useRealtime`, WebSocket bridge | Badge counts, events |

### Reference routes

- **Login:** `LoginPage.jsx` → `/login`
- **Composer:** `AnalyticsModule` → `composer`, `composer/:id` → `ComposerPage.jsx`
- **Shell:** `AppShell`, `TopBar`, `FeatureSidebar`, `WorkspaceSwitcher`

### Composer surface (audit checklist)

Implemented across `ComposerPage.jsx` + `components/composer/*` + `hooks/useComposer.js`:

- Post create/edit, platform pills, caption, media, schedule, publish, draft, approval flows
- Channel connect rail, preview, tags, first comment, queues (separate page)
- Workspace scoping via global switcher + API `X-Client-Id`
- Validation, preflight, OAuth-dependent publish

*(Full feature matrix maintained in refactor tickets per `REFACTOR_ROADMAP.md`.)*

---

## Backend (current state)

| Layer | Location | Notes |
|-------|----------|--------|
| Project | `backend/dashboard/` | Settings, URLs, ASGI, Celery |
| Domain app | `backend/social_stats/` | Models, views, serializers, tasks |
| Auth | JWT + OAuth social, `security/` | Session idle on frontend |
| RBAC | `permissions.py`, marketplace permissions, migrations seeding `Permission` |
| Multi-tenant | `TenantScopedMixin`, `client_ref`, workspace headers |
| Social publish | `publishers/` | **Plugin registry** — `get_publisher`, `register_publisher` |
| Inbox sync | `inbox_tasks.py`, `inbox_views.py` | Celery + DB `Conversation` / `Message` |
| Composer API | `composer_views.py`, related | Posts, media, queues |
| Migrations | `social_stats/migrations/` | Do not rewrite; preserve compatibility |

### Request flow (typical)

```text
HTTP → DRF View / ViewSet → (optional marketplace check) → ORM / tasks
```

**Target flow (incremental):**

```text
HTTP → View (thin) → Service → Repository (optional) → ORM
```

Existing views remain until each endpoint is migrated.

---

## Infrastructure

- **Start stack:** `C:\Project2\social-stats-social-media-manager-start`
- **Bind mount:** `${SOURCE_REL}/frontend`, `${SOURCE_REL}/backend`
- **Env:** `paths.env`, `.env`, `frontend/.env`

---

## Target architecture (manager2)

```text
frontend/src/
  core/           # API client facade, config re-exports, error types
  modules/        # Public module entrypoints (authentication, composer, …)
  components/     # Shared UI (migrating to design system)
  pages/          # Route targets (thin over time)
  services/       # Legacy api.js (split gradually into core/api/*)

backend/
  core/           # Shared utilities (future)
  modules/        # Package facades + future service extraction
  social_stats/   # Legacy Django app (unchanged URLs until migrated)
```

### Styling strategy

| Mechanism | Use for |
|-----------|---------|
| **SCSS** (`styles/scss`) | Tokens, themes, complex components (calendar, composer) |
| **CSS variables** | Brand primary, surfaces (injected from branding config) |
| **Inline styles** | Legacy pages; reduce over time |
| **Tailwind** | Not in use today; add only with an explicit ADR if adopted |

---

## Module independence criteria

A module is “plug-and-play” when:

1. Other code imports only its **`index.js` / `__init__.py` public API**
2. It accepts **configuration** (env, injected API client, workspace context)
3. It does not import sibling modules’ **internal** paths

See [modules.md](./modules.md).

---

## Non-goals (this refactor)

- Visual redesign of Login or Composer
- Breaking API contracts without a documented compatibility layer
- Database schema rewrites without migrations and data plan
- Editing the original `social-stats-social-media-manager` tree
