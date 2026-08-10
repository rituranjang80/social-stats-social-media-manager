# Configuration

Behavior matches the original project; this document applies to **manager2** when `SOURCE_REL` points here.

## Frontend (`frontend/.env`)

Copy from `frontend/.env copy.example`. Key variables:

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | API base (Docker: `http://localhost:8000/api`) |
| `REACT_APP_BRAND_*` | White-label (read only via `config/branding.js`) |
| `REACT_APP_INBOX_DEFAULT_DAYS` | Inbox default date window |
| `GENERATE_SOURCEMAP` | `false` recommended for Docker bind mounts on Windows |

## Backend (`backend/.env` or compose `.env`)

See original `docs/CONFIGURATION.md` in repo root and `social-stats-social-media-manager-start/.env`.

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY`, `DEBUG` | Django core |
| `INBOX_DEMO_REPLY` | Demo inbox replies without live APIs |
| `POST_MANAGEMENT_DIGEST_ENABLED` | When `true`, Celery beat sends client digest emails if Draft / Pending Review / On Hold posts exist in the lookback window |
| `POST_MANAGEMENT_DIGEST_LOOKBACK_DAYS` | Stats window (default `30`) — matches Post Management default date range |
| `POST_MANAGEMENT_DIGEST_HOUR` / `POST_MANAGEMENT_DIGEST_MINUTE` | Local schedule time (UTC unless you change Celery timezone) |
| `POST_MANAGEMENT_DIGEST_DAY_OF_MONTH` / `POST_MANAGEMENT_DIGEST_DAY_OF_WEEK` | Crontab day filters (`*` = any). Default: 1st of each month |
| OAuth / `FIELD_ENCRYPTION_*` | Social connect & token storage |

## Docker paths

In `social-stats-social-media-manager-start/paths.env`:

```env
SOURCE_REL=../social-stats-social-media-manager2
START_REL=.
DATA_REL=./data
```

Restart frontend/backend containers after env changes.

## Branding rule

Application code must import branding from `@app/core/config` (re-export of `config/branding.js`), not from scattered `process.env` reads.
