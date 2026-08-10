# Backend modules (facade layer)

Phase 1 keeps implementations in `social_stats`. This directory documents **module boundaries** for future extraction.

| Package | Implementation today | Public surface |
|---------|---------------------|----------------|
| `authentication/` | `social_stats` auth views, JWT | Document in modules.md |
| `authorization/` | `permissions.py`, marketplace | Permission classes |
| `workspace/` | `Client`, `TenantScopedMixin` | Tenant resolution |
| `social/` | `publishers/` | `get_publisher`, `BasePublisher` |
| `composer/` | composer views | REST under `/api/composer/` |
| `inbox/` | `inbox_views`, `inbox_tasks` | REST + Celery sync |
| `analytics/` | views metrics, overview | Client summary APIs |

## Social provider plug-in

Add a publisher in `social_stats/publishers/` and register it — Composer and Calendar must not import platform SDKs directly.
