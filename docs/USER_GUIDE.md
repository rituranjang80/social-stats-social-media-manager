# User Guide

How to use Social Stats once it's running. This tour uses the three demo accounts
from `demo_setup` (all password `demo`).

## The three account types

| Account | Demo login | Shell | What they can do |
|---|---|---|---|
| **Superadmin / staff** | `admin@demo.local` | `/admin` | Full admin shell: manage all users, agencies, workspaces, audit logs, trust/approval queues, platform compliance. |
| **Agency member** | `agency@demo.local` | `/dashboard` + `/agency/*` | Shared agency dashboard across all client workspaces, plus agency-only management (clients, approvals, billing, marketplace profile). |
| **End user** | `enduser@demo.local` | `/u` | A single workspace they own; connect their own accounts, view their analytics, approve agency work. |

Sign in via `/login` — one-click buttons pick the account for you.

![/login one-click demo sign-in](images/login.png)

---

## Modules

### Analytics dashboard
Daily-metric ingestion across the 5 platforms feeds per-client dashboards and a
time-series API. With demo data you'll see 90 days of charts; with real connected
accounts (see [CONNECT_ACCOUNTS.md](CONNECT_ACCOUNTS.md)) it shows live numbers.
AI-narrated monthly reports summarize the trends in plain language.

![Analytics dashboard](images/dashboard.png)

### Composer + scheduling
One editor with per-platform formatting, brand-voice **AI captions**, scheduling,
and a **content calendar**. Agency posts can route through **approval flows**
before they publish. Drafting and scheduling work without connected accounts;
actually publishing needs them.

**Route:** `/dashboard/analytics/composer` (clients) or
`/admin/analytics/composer` (admin shell). Calendar deep-links support
`?scheduled_date=&scheduled_time=` to prefill the schedule. Calendar **+** /
cell create buttons open Composer with those params plus the active workspace.

The Composer is organized into **Create content**, **Publishing**, **Team
details**, and **Assist** sections. The sticky header shows the active workspace
and current editor status. Caption limits are shown for every selected platform,
media uploads report progress, and an attached item can be replaced from the
existing Media Library without removing it first. Scheduling shows the browser
timezone and offers an **Open calendar** action after a successful schedule.
Queue mode continues to save the post as a draft before queue assignment; use
**Manage queues** to select and manage recurring queues. New drafts do not
preselect a platform: choose one or more connected channels to create matching
live-preview tabs.

### Content calendar (Publish)
**Route:** `/dashboard/analytics/calendar` or `/admin/analytics/calendar`.
BrightBean-style Publish UI: List ↔ Calendar toggle, month/week/day/agenda
views, status / **connected-channel** / tag / search filters, summary counts,
drag-and-drop reschedule, hover **+** on date cells (opens Composer with that
date), and a floating **+** to compose. Bound to the global Switch Workspace.
Defaults: current workspace, current month, **All Channels** + **All Tags**
(shows every scheduled/published post for the workspace — Composer unified
posts and legacy calendar posts). Channel and tag multi-selects support search,
select-all, and clear-all (clear = All). Reference prototype:
`/Brightbean/NewPost.html`.

**Manage workspaces & team access** (other admin pages — not on the composer):

| Concept | URL |
|---|---|
| Workspaces + invitations | http://localhost:8000/admin/clients |
| Members, RBAC, custom roles | http://localhost:8000/admin/management |
| Per-workspace settings | http://localhost:8000/admin/client/`{clientId}`/settings |
| Composer | http://localhost:8000/admin/analytics/composer |
| Django DB admin (operators only) | http://localhost:8000/django-admin/ |

> Note: `/admin/*` is the **React** app shell. Low-level Django admin lives at
> `/django-admin/` so the two no longer conflict behind the Docker gateway.

The app uses a single **Switch Workspace** control in the top navigation bar
(desktop and mobile). The selection is the global active workspace (`Client`),
persisted in the browser, and applied to API requests automatically. Composer,
dashboard, calendar, media, inbox, and settings all bind to that workspace —
no per-page workspace chrome on the composer.

**Compose features (in addition to caption + media + schedule):**
- **Brightbean-aligned chrome** — Create/Edit header with back + Preview,
  workspace/status context, orange accents, stone surfaces, account-style
  platform cards, caption card with inline media + Media Library link /
  per-platform character guidance, empty live-preview state, and modular shell
  components. Form sections use reusable **T-Type** `TCard` / `TInput` /
  `TTextArea` containers in a responsive card grid. Secondary team and AI
  sections collapse to reduce scrolling.
  **Connected channels** — Brightbean-style account cards for connected
  accounts only (logged-in user avatar / initials, platform icon, name, handle,
  workspace chip, connected badge). Selection still drives which platforms the
  post publishes to.
  **Media Library** in the caption card opens an in-composer picker modal
  (does not leave the page); selected assets appear in the media row and are
  saved/published with the post. Use the replace control on a media thumbnail
  to swap that item through the same picker.
  **YouTube Settings** — when YouTube is a selected channel, Composer shows a
  dedicated settings card (visibility, audience / Made for Kids, tags, category,
  license, distribution, comments prefs, advanced + metadata). **Custom
  Thumbnail** opens a frame-capture dialog (reuse Video Studio extract path);
  the chosen image is saved on the draft and sent with YouTube publish.
  Reference: `/Brightbean/YouTubeBrightbean.html`.
  Keyboard: **Ctrl/Cmd+S** saves draft. Workspace switching is in the **global
  top bar**, not the composer header.
- **Connect channels** — CHANNELS icon grid in the left Analytics sidebar
  (under **Publish**, inside `.sidebar-scroll`) for the **current** workspace.
  Post targets still use the composer platform pills. Driven by `PLATFORM_*` /
  `CONNECT_PLATFORMS` in SocialMediaStart `.env`. Manage from
  **Settings → Connect Accounts**.
- **First comment** — optional comment auto-posted after publish on Facebook,
  Instagram, and LinkedIn.
- **Tags** — internal team-only labels (not caption hashtags); suggestions from
  prior posts in the active workspace.
- **Internal notes** — team-only; never published.
- **Live preview** — per-platform preview drawer (mobile) / side panel (desktop).
  On desktop, collapse/expand with the **top-aligned** right-edge chevron
  (same idea as the left sidebar toggle) so the editor can use full width.
  The composer form scrolls inside its panel when content is long. Preview tabs
  support Left/Right Arrow plus Home/End keyboard navigation.

![Composer + scheduler](images/composer.png)

### Media Library + Video Studio
**Media Library** (`/dashboard/analytics/media` or `/admin/analytics/media`)
shows real image previews and the first frame of videos. Click tiles to
multi-select for bulk delete. **Double-click a video** opens it in
**Video Studio** (`…/analytics/video?asset_id=…`) for trim, resize, thumbnail,
captions, and YouTube publish.

From the **composer**, **Media Library** opens a modal picker (same library
body) so you can attach existing assets without leaving the draft. Drag the
dialog header to reposition it. Videos show a first-frame preview in the media
row and in the live platform Preview panel.

### Unified inbox
One queue across DMs, comments, and Google reviews, with **AI reply suggestions**
in your brand voice. Reply, assign, and resolve from a single screen.

![Unified inbox](images/inbox.png)

### WhatsApp bot builder
A visual flow editor with conditional branches and **AI chat nodes**. Build
automated WhatsApp conversations, capture leads (pushed to the CRM), and route
click-to-WhatsApp ad traffic into flows. Requires a connected WhatsApp account —
see [CONNECT_WHATSAPP.md](CONNECT_WHATSAPP.md).

![Click-to-WhatsApp flow editor](images/bot-builder.png)

### Agency marketplace
A two-sided directory: end users can browse and invite an agency to manage their
workspace, and agencies can publish a marketplace profile. Invitations and
client/agency relationships are managed here.

### AI assistant
A **Cmd/Ctrl+J** assistant with tool use, available throughout the app. It draws
on brand-voice training, your analytics, and insights/forecasts. Powered by
Anthropic Claude — set `ANTHROPIC_API_KEY` to enable it (see
[CONFIGURATION.md](CONFIGURATION.md)).

---

## A suggested first walkthrough (demo data)

1. Sign in as **agency** (`agency@demo.local`) → land on `/dashboard`; explore the
   cross-client analytics.
2. Open the **composer** (`/dashboard/analytics/composer` or
   `/admin/analytics/composer`), confirm the active workspace in the **top bar
   Switch Workspace** control, draft a post, add tags / a first comment,
   schedule or publish.
   try an AI caption, and schedule it on the calendar.
3. Open the **inbox** and try an AI reply suggestion.
4. Sign in as **end user** (`enduser@demo.local`) → see the single-workspace view
   and the agency relationship.
5. Sign in as **superadmin** (`admin@demo.local`) → browse the admin shell, audit
   log, and approval queues.

When you're ready for real data, connect accounts
([social](CONNECT_ACCOUNTS.md) / [WhatsApp](CONNECT_WHATSAPP.md)) and turn off the
demo seed.
