# Modules — boundaries & public APIs

## Frontend modules

Each folder under `frontend/src/modules/<name>/` exposes a **single public entry** (`index.js`). Application code should migrate to:

```javascript
import { X } from '@app/modules/<name>';
```

| Module | Public API (Phase 1) | Legacy implementation |
|--------|----------------------|------------------------|
| `authentication` | `LoginPage`, `useAuth`, `AuthProvider` | `pages/LoginPage`, `hooks/useAuth` |
| `composer` | `ComposerPage`, `useComposer` | `pages/composer`, `hooks/useComposer` |
| `workspace` | `useWorkspace`, `WorkspaceSwitcher` | `hooks/useWorkspace`, `components/workspace` |
| `analytics` | `AnalyticsModule` (route shell) | `modules/AnalyticsModule.jsx` |
| `inbox` | `UnifiedInboxPage`, inbox config | `pages/inbox`, `config/inbox.js` |
| `social` | Platform catalog, channel filter | `constants/socialPlatforms`, `ConnectedChannelFilter` |

### Shared cross-cutting

| Package | Role |
|---------|------|
| `@app/core/api` | Axios client + domain APIs (facade over `services/api.js`) |
| `@app/core/config` | Branding + feature config readers |
| `@app/components/analytics/WorkspaceChannelToolbar` | Date + channel + sync toolbar |

## Backend modules (Phase 1 — facades)

Physical code still lives in `social_stats`. Facades under `backend/modules/` document and re-export stable surfaces:

| Module | Stable surface today | Future extraction |
|--------|---------------------|-------------------|
| `authentication` | JWT views, OAuth callbacks | `modules/authentication/services/` |
| `authorization` | `permissions`, marketplace checks | Policy service |
| `workspace` | Client model, tenant mixin | Workspace service |
| `social` | `publishers` registry | Provider interface per platform |
| `composer` | Composer viewsets | Composer service layer |
| `analytics` | Metrics, overview | Analytics service |
| `inbox` | `inbox_views`, `inbox_tasks` | Inbox sync service |

### Social provider interface (existing)

```text
BasePublisher → register_publisher / get_publisher
```

New platforms: implement publisher + register; do not fork Composer.

## Import rules

**Allowed:**

```text
pages/composer/ComposerPage.jsx  →  @app/modules/workspace
pages/composer/ComposerPage.jsx  →  @app/core/api
```

**Avoid:**

```text
modules/composer  →  pages/inbox/internal/...
modules/analytics →  components/composer/ComposerCaptionEditor (import via @app/modules/composer when exported)
```

## Adding a module

1. Create `frontend/src/modules/<name>/index.js` public exports only.
2. Add entry to `frontend/src/modules/_registry.js`.
3. Document env vars in `docs/configuration.md`.
4. Add tests under `backend/social_stats/tests/` or `frontend/src/**/*.test.jsx`.
