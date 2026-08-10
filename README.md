# Social Stats — Refactored codebase (`social-stats-social-media-manager2`)

This repository is the **plug-and-play refactor** of [social-stats-social-media-manager](../social-stats-social-media-manager). The original project stays **unchanged** and remains the reference implementation.

## Status

**Phase 1 complete:** full codebase copy, architecture audit, module boundaries, public facades, and Docker run instructions.

Incremental migration (Login → Composer → remaining modules) is tracked in [`docs/REFACTOR_ROADMAP.md`](docs/REFACTOR_ROADMAP.md).

## Run with Docker (same as original)

1. Open `C:\Project2\social-stats-social-media-manager-start\paths.env`
2. Point application source at this folder:

   ```env
   SOURCE_REL=../social-stats-social-media-manager2
   ```

3. From `social-stats-social-media-manager-start\scripts`:

   ```powershell
   .\compose-up.ps1
   ```

4. Validate reference pages:

   - http://localhost:3000/login
   - http://localhost:3000/admin/analytics/composer

To switch back to the original app, set `SOURCE_REL=../social-stats-social-media-manager`.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | Audit + target architecture |
| [docs/modules.md](docs/modules.md) | Module boundaries & public APIs |
| [docs/components.md](docs/components.md) | UI / design system |
| [docs/api.md](docs/api.md) | API client layer |
| [docs/configuration.md](docs/configuration.md) | Env & branding |
| [docs/development.md](docs/development.md) | Local dev & testing |
| [docs/deployment.md](docs/deployment.md) | Deploy notes |
| [docs/REFACTOR_ROADMAP.md](docs/REFACTOR_ROADMAP.md) | Migration phases |

## Plug-and-play imports (frontend)

```javascript
import { LoginPage, useAuth } from '@app/modules/authentication';
import { ComposerPage } from '@app/modules/composer';
import { useWorkspace } from '@app/modules/workspace';
import { apiClient } from '@app/core/api';
```

Path aliases are configured in [`frontend/jsconfig.json`](frontend/jsconfig.json) (`@app/*` → `src/*`).

## Plug-and-play imports (backend)

Backend modular packages live under `backend/modules/` as documented facades; Django still loads `social_stats` until views are migrated service-by-service. See [docs/modules.md](docs/modules.md).

## Rules

- Do **not** edit `social-stats-social-media-manager` when working in this repo.
- Refactor **incrementally**; preserve API contracts and UI for Login and Composer.
- No hardcoded tenant IDs, secrets, or brand strings — use `.env` and [`frontend/src/config/branding.js`](frontend/src/config/branding.js).
