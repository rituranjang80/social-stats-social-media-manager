# API layer

## Frontend

**Canonical implementation:** `frontend/src/core/api/` — `client.js` (axios, JWT refresh, workspace headers) plus domain modules (`auth.js`, `clients.js`, `composer.js`, `inbox.js`, …).

**Legacy barrel:** `frontend/src/services/api.js` re-exports `@app/core/api` for existing imports.

**Public facade:** `frontend/src/core/api/index.js`

```javascript
import { apiClient, inboxAPI, composerAPI, clientsAPI } from '@app/core/api';
```

Rules:

- Components and pages should migrate to `@app/core/api` imports (facade re-exports).
- Do not add new raw `fetch()` calls in feature code.
- Workspace scope: automatic via interceptors (`X-Client-Id`); auth bootstrap paths excluded.

## Backend

**Base URL:** `/api/` (via gateway in Docker).

Contract preservation: refactor **must not** change request/response shapes for Login, Composer, and workspace-scoped CRUD without versioning.

Key endpoint groups (reference):

| Domain | Prefix |
|--------|--------|
| Auth | `/api/auth/` |
| Clients / workspace | `/api/clients/` |
| Composer | `/api/composer/` |
| Inbox | `/api/inbox/` |
| OAuth | `/api/oauth/` |
| Analytics | overview, client summary/timeseries |

OpenAPI: `backend/social_stats/openapi.py` (when enabled).

## Error shape

DRF + custom exception handler (`error_monitoring/exception_handler.py`). Frontend should use centralized handlers in the api client, not ad-hoc parsing per page.
