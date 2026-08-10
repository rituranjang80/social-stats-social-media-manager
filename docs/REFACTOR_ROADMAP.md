# Refactor roadmap

Incremental migration in **manager2 only**. Original repo stays frozen.

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Audit, copy to manager2, docs, core/module facades, jsconfig aliases | **Done** |
| 2 | Split `services/api.js` into `core/api/*` re-exports (no behavior change) | **Done** |
| 3 | Authentication module extraction (Login thin wrapper) | Planned |
| 4 | Workspace provider interface | Planned |
| 5 | Composer decomposition (UI vs hooks vs API) | Planned |
| 6 | Inbox / Analytics / Calendar module exports | In progress (Inbox toolbar done in source; copied) |
| 7 | Backend service layer for composer + inbox | Planned |
| 8 | SCSS token consolidation | Planned |
| 9 | Test coverage for module public APIs | Planned |
| 10 | Visual regression Login + Composer | Planned |

## Phase 5 — Composer (critical)

Before moving files, inventory `ComposerPage.jsx` + `useComposer.js` + `composerAPI` methods. Extract in order:

1. `ComposerCaptionEditor`, media, schedule as pure props components (already partial)
2. `useComposerState` hook (state only)
3. `useComposerActions` (API calls via `@app/core/api`)
4. Page = layout + wiring only

**Do not** change UX or API payloads during extraction.

## Phase 10 — Validation checklist

- [ ] `npm run build` in frontend container
- [ ] `python manage.py test social_stats`
- [ ] `/login` pixel/behavior parity
- [ ] `/admin/analytics/composer` feature parity
- [ ] No console errors on shell navigation
- [ ] Workspace switch + OAuth connect still work

## Module independence test

For each module in [modules.md](./modules.md), verify: *Can another app import `index.js` with only env + API base configuration?* If not, log the blocking import in this file.
