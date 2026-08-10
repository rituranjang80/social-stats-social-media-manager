# Components & design system

Visual reference: **existing** Login and Composer in the source app (parity required).

## Existing UI primitives (`frontend/src/components/ui/`)

Includes (non-exhaustive): `Button`, `Card`, `Badge`, `Tabs`, `DataTable`, `DateRangePicker`, `EmptyState`, `ErrorBoundary`, `InteractiveDialog`, `DialogHost`, `PageHeader` (layout), loaders, toasts (via `react-hot-toast`).

## Layout & shell

- `components/shell/AppShell`, `TopBar`, `FeatureSidebar`
- `components/layout/PageHeader`

## Feature components (migrate behind module exports)

- **Composer:** `components/composer/*`
- **Calendar:** `components/calendar/*` including `ConnectedChannelFilter`
- **Channels:** `components/channels/*`

## SCSS structure (current)

```text
frontend/src/styles/scss/
  abstracts/   (variables — expand for tokens)
  base/
  components/
  layouts/
  pages/       (feature SCSS e.g. calendar.scss)
```

**Rule:** shared tokens in SCSS variables/CSS custom properties; avoid duplicating hex values in new components—use `var(--*)` and branding injection.

## Tailwind

Not installed in the current stack. If added later, use Tailwind for layout utilities only; keep component chrome in SCSS to match existing Login/Composer.

## Generic component guidelines

- Props-driven: no hardcoded workspace/user IDs
- Accept `clientId`, `channels`, `onSave` callbacks
- Use `@app/core/config` for brand strings, never inline product name
