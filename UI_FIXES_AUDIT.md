# Statox UI Fixes — Stage 1 Audit

**Scope.** Code-level audit of the Statox frontend (and backend touchpoints) covering theme system, branding, platform list, header/nav, and end-user vs agency distinction. Five parallel sub-agents read the relevant files; this document synthesizes their findings into a fix list ranked by severity.

**What this audit can and can't tell you.** I read the code and grepped for issue patterns. I did **not** drive a real browser, so visual breakpoint tests, mega-menu hover behaviour, and theme-toggle persistence across reloads need your eyes. Items marked `[VISUAL]` need browser verification before/after the fix; items marked `[CODE]` are confirmable by re-reading the file.

---

## P0 — Functional bugs uncovered during the audit (must triage before polish)

These aren't UX polish — they're broken behaviour discovered while looking at the requested issues.

| # | Where | Bug | Impact |
|---|-------|-----|--------|
| 1 | [App.js:148-150](frontend/src/App.js#L148-L150) | `/admin/billing` and `/admin/marketplace-profile` are protected by `roles=['superadmin','staff']` but they are **agency-member-only pages**. Agency members have `role='client'`. | Agency-member clients literally cannot open their own billing or marketplace profile today. |
| 2 | [App.js:252-260](frontend/src/App.js#L252-L260) | `RootRedirect` only checks `user.role`, never `profile.account_type`. All clients land at `/dashboard` regardless of whether they're end-users or agency members. | End users get the agency dashboard on login, then have to manually navigate to `/u`. |
| 3 | [models.py:1238-1244](backend/social_stats/models.py#L1238-L1244) | `HashtagSet.PLATFORM_CHOICES` includes `'tiktok'` — a platform the product no longer supports. | Stale enum choice; UI dropdowns may surface it. |

These three need a verdict from you before Stage 7 routing work. They cannot be fixed in isolation by a CSS pass.

---

## ISSUE 1 — Theme system

### Foundations (already correct)

- [`useTheme.js`](frontend/src/hooks/useTheme.js) is structurally sound — sets `data-theme` on `<html>`, persists to `localStorage`, has `bootstrapTheme()` called pre-render in [`index.js:9`](frontend/src/index.js#L9).
- [`tokens.css`](frontend/src/styles/tokens.css) defines a complete light/dark token system with `--surface-*`, `--text-*`, `--border-*`, semantic colors, shadows, z-index scale.
- [`ThemeToggle.jsx`](frontend/src/components/ui/ThemeToggle.jsx) uses CSS variables correctly.

### Things to fix

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1.1 | **P1** | [useTheme.js:17-19](frontend/src/hooks/useTheme.js#L17-L19) | Default preference is `'system'`. User wants `'light'` as default. |
| 1.2 | **P1** | [useTheme.js:64-67](frontend/src/hooks/useTheme.js#L64-L67) | `toggle()` cycles light → dark → system → light (3-state). User wants binary toggle in TopBar/MarketingNav, with the 3-way Light/Dark/System chooser surfaced in Settings → Appearance only. |
| 1.3 | **P1** | [App.js:262-302](frontend/src/App.js#L262-L302) | `<Loader>` splash uses hardcoded `background: '#0f172a'` and `color: '#334155'` → page-load splash is always dark, even in light mode. |
| 1.4 | **P1** | [public/index.html:6,12](frontend/public/index.html#L6) | `<meta name="theme-color" content="#0f172a">` and `msapplication-TileColor` are dark. iOS Safari paints the URL bar dark even when the app is in light mode. Use a `prefers-color-scheme` media-query swap. |
| 1.5 | **P1** | [public/index.html:5](frontend/public/index.html#L5) | Viewport has `maximum-scale=1, user-scalable=no` — accessibility regression (blocks pinch-to-zoom). Drop those attrs. |
| 1.6 | **P1** | [index.js:18-537](frontend/src/index.js#L18-L537) | A second `:root` block is injected at runtime via `document.createElement('style')` defining **legacy** tokens (`--bg`, `--surface`, `--blue`). It also defines a dark-mode bridge for those legacy names. This dual-token system works but is a maintenance hazard — every new component must remember to use the new tokens. Consider migrating off legacy or at least moving the legacy block into a real CSS file. |
| 1.7 | **P2** | [index.js:171-274](frontend/src/index.js#L171-L274) | `.skeleton` and `.skeleton-card` gradients hardcode `#f1f5f9` / `#e2e8f0` light values. There IS a dark override at [index.js:531-535](frontend/src/index.js#L531-L535) — confirmed correct. (Earlier audit pass flagged this incorrectly; verified safe.) |

### Hardcoded colors (won't adapt to dark mode) — top offenders by severity

The audit found **~1,247 hardcoded color literals** across the frontend. Top severity:

| File | Hits | What | Severity |
|------|------|------|----------|
| [Modal.jsx:93](frontend/src/components/ui/Modal.jsx#L93) | 1 | Backdrop `rgba(10, 14, 20, 0.55)` | **P1** — affects every modal |
| [Drawer.jsx:76](frontend/src/components/ui/Drawer.jsx#L76) | 1 | Backdrop `rgba(10, 14, 20, 0.55)` | **P1** — affects every drawer |
| [Charts.jsx:37-111](frontend/src/components/charts/Charts.jsx#L37-L111) | ~10 | Every grid stroke, line color, bar fill is hardcoded hex | **P1** — analytics breaks in dark mode |
| [IntegrationsPage.jsx:152-240](frontend/src/pages/IntegrationsPage.jsx#L152-L240) | 30+ | `rgba(255,255,255,...)` hardcoded for light text on dark gradient. If the dark gradient also becomes a CSS variable, the contrast inverts in light mode. | P2 |
| [CompetitorSection.jsx](frontend/src/components/ui/CompetitorSection.jsx) | 11 | `color: '#0f172a'` | P2 — invisible in dark mode |
| [FacebookConnectModal.jsx](frontend/src/components/FacebookConnectModal.jsx) | 13 | 5× `color: '#0f172a'` + 8× `background: '#fff'` | P2 |
| [BestPostWidget.jsx](frontend/src/components/ui/BestPostWidget.jsx) | 5 | `color: '#1e293b'` | P2 |
| [ShareReportModal.jsx:294-301](frontend/src/components/ui/ShareReportModal.jsx#L294) | 4 | Hardcoded `#fff` + dark text + `rgba(0,0,0,.45)` backdrop | P2 |
| [GMBWidget.jsx](frontend/src/components/ui/GMBWidget.jsx) | 4 | `color: '#0f172a'` + `background: '#fff'` | P2 |
| [Tooltip.jsx](frontend/src/components/ui/Tooltip.jsx) | 1 | `background: '#0f172a'` | P2 — tooltips invert wrong |
| [OnboardingChecklist.jsx](frontend/src/components/ui/OnboardingChecklist.jsx) | ~3 | `#fff` + dark text | P3 |
| [PostDrawer.jsx:56](frontend/src/components/calendar/PostDrawer.jsx#L56), [PostFormDrawer.jsx:213](frontend/src/components/calendar/PostFormDrawer.jsx#L213) | 2 | `rgba(0,0,0,0.4)` backdrops | P3 |
| [AlertBell.jsx](frontend/src/components/ui/AlertBell.jsx) | 2 | `color: '#0f172a'` + `#1e293b` | P3 |
| [GoalTracker.jsx](frontend/src/components/ui/GoalTracker.jsx) | 2 | `background: '#fff'` + dark text | P3 |
| [ConnectedAccounts.jsx](frontend/src/components/ui/ConnectedAccounts.jsx) | 2 | `color: '#0f172a'` | P3 |

**Marketing pages** (HomePage, ForBusinessesPage, ForAgenciesPage, FeaturesPage, PricingPage) use heavy inline `style={{ ... }}` blocks for hero gradients with `rgba(255,255,255,...)` text — most marketing heroes are dark-by-design (gradient backgrounds with light text), so the question is whether dark mode should keep those gradient sections dark or invert them. **Recommended approach:** keep marketing hero sections visually identical across light/dark by using fixed gradient backgrounds; everything below the hero adapts.

### Recommended fix order (Stage 2)

1. Flip `useTheme.js` default to `'light'`.
2. Add a `prefers-color-scheme` media query for `theme-color` meta to the `<head>`.
3. Add a CSS variable `--overlay-backdrop` to tokens.css (`rgba(10,14,20,0.55)` light / `rgba(0,0,0,0.6)` dark) and replace Modal/Drawer/PostDrawer/ShareReportModal hardcoded backdrops.
4. Make the `<Loader>` splash theme-aware (use `var(--surface-page)` and `var(--text-tertiary)`).
5. Replace `theme-color` meta with the swap.
6. Sweep [Charts.jsx](frontend/src/components/charts/Charts.jsx) — single file, high impact. Move colors into a `chartTokens` object pulled from `getComputedStyle(document.documentElement).getPropertyValue('--token')`.
7. Bulk regex pass for `color:\s*['"]#0f172a` and `color:\s*['"]#1e293b` → `var(--text-primary)` / `var(--text-secondary)`. Same for `background:\s*['"]#fff` → `var(--surface-card)`.
8. Make `ThemeToggle.toggle()` binary; expose `setTheme('system')` for the Settings → Appearance picker.
9. `[VISUAL]` Walk through every page in dark mode — at minimum: dashboard, analytics, composer, calendar, inbox, settings, marketing home, pricing, bot editor.

**Effort:** 4-6 hours for the bulk pass, plus 1-2 hours of visual QA.

---

## ISSUE 2 — Branding consistency ("Statox AI" everywhere)

### Spelling inconsistency

| File:Line | Current | Fix |
|-----------|---------|-----|
| [public/manifest.json:2](frontend/public/manifest.json#L2) | `"short_name": "StatoX"` | `"Statox AI"` |
| [public/manifest.json:3](frontend/public/manifest.json#L3) | `"name": "StatoX — Social Media Analytics"` | `"Statox AI — Marketing OS"` |
| [public/manifest.json:4](frontend/public/manifest.json#L4) | description doesn't mention "AI" | `"AI-powered marketing platform for agencies and businesses"` |
| [public/index.html:52](frontend/public/index.html#L52) | `<noscript>...run StatoX.</noscript>` | `Statox AI` |
| [App.js:275](frontend/src/App.js#L275), [App.js:289](frontend/src/App.js#L289) | `alt="STATOX"` and `STATOX` text node | `Statox` |
| [styles/theme.js](frontend/src/styles/theme.js) | comment `/* StatoX Design System` | `Statox` |

### Third-party AI vendor / model names in user-facing copy (must fix)

26 instances. The worst — visible in Google search results, social-card previews, and the public landing — are at the top:

| File:Line | Current | Fix |
|-----------|---------|-----|
| [public/index.html:7](frontend/public/index.html#L7) | meta description: `"...Powered by Claude."` | Drop "Powered by Claude" — say "AI-powered" or remove the suffix entirely |
| [HomePage.jsx:63](frontend/src/pages/HomePage.jsx#L63) | Meta description: "Powered by Claude. Built for India + the world." | Remove vendor + geographic claim |
| [HomePage.jsx:744](frontend/src/pages/HomePage.jsx#L744) | Hero eyebrow: `"POWERED BY ANTHROPIC CLAUDE"` | `"POWERED BY STATOX AI"` |
| [HomePage.jsx:755](frontend/src/pages/HomePage.jsx#L755) | `"Claude shows up wherever you're stuck"` | `"Statox AI shows up wherever you're stuck"` |
| [HomePage.jsx:800](frontend/src/pages/HomePage.jsx#L800) | Comparison table: `"Deep AI assistant (Claude)"` | `"Deep AI assistant"` |
| [MarketingLayout.jsx:53](frontend/src/components/marketing/MarketingLayout.jsx#L53) | Mega-menu item description: `"Claude in every corner"` | `"Statox AI in every corner"` |
| [MarketingLayout.jsx:757](frontend/src/components/marketing/MarketingLayout.jsx#L757) | Footer: `"Built with Claude"` | `"Built with Statox AI"` or remove |
| [AIAssistantPanel.jsx:140](frontend/src/components/shell/AIAssistantPanel.jsx#L140) | `"Powered by Claude · Cmd/Ctrl + J"` | `"Powered by Statox AI · Cmd/Ctrl + J"` |
| [CaptionWriterPage.jsx:757,841](frontend/src/pages/CaptionWriterPage.jsx#L757) | `"Claude is writing your captions…"` / `"Claude is researching hashtags…"` | `"Statox AI is …"` |
| [PostIdeasPage.jsx:630](frontend/src/pages/PostIdeasPage.jsx#L630) | `"Claude is crafting personalised post ideas…"` | `"Statox AI is …"` |
| [BotFlowsListPage.jsx:410](frontend/src/pages/bots/BotFlowsListPage.jsx#L410) | `"Claude drafts the flow."` | `"Statox AI drafts the flow."` |
| [AutomationsPage.jsx:445](frontend/src/pages/automations/AutomationsPage.jsx#L445) | `"Claude writes a short on-brand reply…"` | `"Statox AI …"` |
| [AIStudio.jsx:71](frontend/src/pages/ai/AIStudio.jsx#L71) | Eyebrow: `"✨ Powered by Anthropic Claude"` | `"✨ Powered by Statox AI"` |
| [AIAuditPage.jsx:215](frontend/src/pages/ai/AIAuditPage.jsx#L215) | Footer: `"Statox AI runs on Anthropic Claude."` | `"Statox AI powers these requests."` (move vendor disclosure to Privacy Policy where it's appropriate) |
| [productPages.js:367,429,432,437](frontend/src/pages/marketing/productPages.js) | Multiple "Claude with tool use" / "Claude with hands" / heroSubtitle | Replace with "Statox AI" |
| [CompetitorsPage.jsx](frontend/src/pages/growth/CompetitorsPage.jsx) | `"Claude analyses 30 days of snapshots"` | `"Statox AI …"` |
| [ComingSoonPage.jsx](frontend/src/pages/marketing/ComingSoonPage.jsx) | `"Claude in every corner."` | `"Statox AI in every corner."` |

### Acceptable references (keep)

- **Internal code** (model IDs, Anthropic SDK calls in `backend/social_stats/sentiment.py`, `tasks.py`, `ai_helpers.py`).
- **Privacy Policy / GDPR / DPDP pages** — vendor disclosure is appropriate and legally desirable for transparency.
- **About page bios** ("Anthropic and Hugging Face alum" — that's a true biographical fact about a founder).
- **Lucide icon imports** like `import { Twitter } from 'lucide-react'` — those are icons, not platform claims.

### Edge case: [IntegrationsPage.jsx](frontend/src/pages/IntegrationsPage.jsx)

The Integrations page lists `Anthropic Claude`, `OpenAI`, `Google Gemini` as **integration cards** — implying the user can plug in their own keys for those providers. If that's a real, working feature (BYOK), keep them; the rule about Statox AI branding applies to the *Statox-provided* AI, not to user-configurable integrations. **Need a product call from you on this one.**

---

## ISSUE 3 — Unsupported platforms

### Frontend (must remove)

| File:Line | Platform | Action |
|-----------|----------|--------|
| [IntegrationsPage.jsx:53-56](frontend/src/pages/IntegrationsPage.jsx#L53-L56) | X/Twitter (live=true!), TikTok, Pinterest, Threads | Delete the 4 entries |
| [AIWriteButton.jsx:46](frontend/src/components/ai/AIWriteButton.jsx#L46) | `'twitter'` in `PLATFORM_OPTIONS` | Remove |
| [StatusPage.jsx:92](frontend/src/pages/StatusPage.jsx#L92) | `'x'` in `FALLBACK_SERVICES` | Remove |
| [PrivacyPolicyPage.jsx:39](frontend/src/pages/PrivacyPolicyPage.jsx#L39) | "X (Twitter)" in connected-platforms list | Remove from the list (not from history) |
| [BlogPostPage.jsx:200](frontend/src/pages/BlogPostPage.jsx#L200) | "Share on Twitter" share button | Remove or replace with LinkedIn share |
| [productPages.js:117](frontend/src/pages/marketing/productPages.js#L117) | `"Twitter loves hashtags"` copy | Reword |
| [blogPosts.js:192,194](frontend/src/pages/marketing/blogPosts.js) | "Twitter trimmed to 280" example | Reword |

### Backend (must remove)

| File:Line | Platform |
|-----------|----------|
| [models.py:1243](backend/social_stats/models.py#L1243) | `('tiktok', 'TikTok')` in `HashtagSet.PLATFORM_CHOICES` (P0 — see top of doc) |
| [hashtag_views.py:42](backend/social_stats/hashtag_views.py#L42) | `'tiktok'` rule |
| [health_views.py:85](backend/social_stats/health_views.py#L85) | `('x', 'X (Twitter) integration')` in `_THIRD_PARTY` |
| [ai/prompts/compose.py:27-28](backend/social_stats/ai/prompts/compose.py#L27-L28) | `'twitter'`, `'threads'` rules |
| [ai/prompts/image_to_post.py:25](backend/social_stats/ai/prompts/image_to_post.py#L25) | `'twitter'` rule |
| [ai/prompts/post_improve.py:28](backend/social_stats/ai/prompts/post_improve.py#L28) | `'twitter'` rule |
| [ai/prompts/summarize.py:17](backend/social_stats/ai/prompts/summarize.py#L17) | "Twitter/X-style line" docstring |
| [ai/prompts/video_script.py:7](backend/social_stats/ai/prompts/video_script.py#L7), [hashtag_research.py:9](backend/social_stats/ai/prompts/hashtag_research.py#L9) | docstring examples list `tiktok`, `twitter` |

### Confirmed clean (no action)

- [`platforms.js`](frontend/src/services/platforms.js) — only the 5 supported.
- Main `PLATFORM_CHOICES` in models.py:9-14 — only the 5.
- OAuth handlers in `oauth_views.py` — only the 5.

### False positives (keep — these are NOT platform claims)

- Statox's own marketing presence: `<a href="https://twitter.com/statox">` in [MarketingLayout.jsx:686](frontend/src/components/marketing/MarketingLayout.jsx#L686), [JsonLd.jsx:47](frontend/src/components/JsonLd.jsx#L47), [AboutPage.jsx:225](frontend/src/pages/AboutPage.jsx#L225) — that's *our* social handle, not a supported integration.
- `<meta name="twitter:card">` — Open Graph standard for link previews. Keep.
- `import { Twitter, Youtube } from 'lucide-react'` — icon library; the `Twitter` icon is used for our own Twitter link.
- "Conversation thread", "comment thread", `commentThreads` (YouTube API) — generic threading, not the Threads platform.

### Recommended structural change to `platforms.js`

The current shape is bare-bones. The user's spec calls for `id`, `name`, `shortName`, `icon` (Lucide component), `color`, `gradient`, `features`, `description`. Migrating to that shape requires touching every consumer of `PLATFORMS` — a one-day refactor by itself. **Recommend deferring to Stage 3** as a separate task; the platform-removal sweep can ship first against the current shape.

---

## ISSUE 4 — Header / nav UI

### Active vs legacy components

The shell has two parallel implementations. **The active one** (mounted by `App.js`) is:

```
AppShell.jsx
├── ModuleRail.jsx       (left 64px, icons-only)
├── FeatureSidebar.jsx   (left 240px, contextual nav per module)
├── TopBar.jsx           (top 56px, desktop only)
├── MobileNav.jsx        (bottom tabs, mobile only)
└── MobileTopBar         (inline in AppShell, mobile only)
```

Marketing pages use [`MarketingLayout.jsx`](frontend/src/components/marketing/MarketingLayout.jsx).

**Legacy components** still in the repo but not referenced by the active shell:

- [`MobileHeader.jsx`](frontend/src/components/layout/MobileHeader.jsx) — hardcoded light-mode colors, breaks dark theme
- [`BottomNav.jsx`](frontend/src/components/layout/BottomNav.jsx) — hardcoded `rgba(255,255,255,0.95)` etc.
- [`Sidebar.jsx`](frontend/src/components/layout/Sidebar.jsx) — extensively hardcoded; will not adapt at all to dark mode

**Recommendation:** verify these three are truly unused (`grep -r "from.*layout/Sidebar" frontend/src/`). If they are dead code, delete them rather than fix them. If still imported anywhere, treat them as P1 theme bugs.

### Header bugs in active components

| # | Severity | File:Line | Bug | Symptom |
|---|----------|-----------|-----|---------|
| 4.1 | **P1** | [MarketingLayout.jsx:150,222,231,249](frontend/src/components/marketing/MarketingLayout.jsx#L150) | Mega-menu uses `onMouseLeave={() => setOpenMenu(null)}` with no grace period | `[VISUAL]` Menu flickers closed when pointer crosses gap between trigger and panel |
| 4.2 | **P1** | [TopBar.jsx:81](frontend/src/components/shell/TopBar.jsx#L81) | Command palette trigger fixed `width: 280px`, no `flex-shrink` | `[VISUAL]` Pushes "What's New" pill and notifications off-screen at 1024-1200px |
| 4.3 | **P2** | [ModuleRail.jsx:259-260](frontend/src/components/shell/ModuleRail.jsx#L259-L260) | UserMenu dropdown is `position: 'absolute', left: calc(100% + 12px), bottom: 0` — no viewport overflow guard | `[VISUAL]` Clipped on narrow phones (<340px) |
| 4.4 | **P2** | [FeatureSidebar.jsx:258](frontend/src/components/shell/FeatureSidebar.jsx#L258) | ClientSwitcher dropdown opens upward with no edge guard | `[VISUAL]` Could clip on short viewports |
| 4.5 | **P2** | [ThemeToggle.jsx](frontend/src/components/ui/ThemeToggle.jsx) | 3-state cycle (light/dark/system) | Confuses users — the "system" state isn't visually distinct enough |
| 4.6 | **P2** | AppShell mobile drawer | Has `role="dialog"`, `aria-modal`, focuses ref — but no focus trap. Tab key escapes the drawer. | A11y issue |
| 4.7 | **P3** | [MarketingLayout.jsx:439-450](frontend/src/components/marketing/MarketingLayout.jsx#L439-L450) | Mobile drawer has no visible backdrop — slides over content | `[VISUAL]` Looks abrupt; user doesn't realize content is dimmed |
| 4.8 | **P3** | [MobileTopBar (in AppShell)](frontend/src/components/shell/AppShell.jsx) | No theme toggle on mobile top bar | Mobile users have to dig into Settings to switch theme |

### Theme toggle placement

| Location | Status |
|----------|--------|
| TopBar (desktop authenticated) | ✓ Present at [TopBar.jsx:110](frontend/src/components/shell/TopBar.jsx#L110) |
| MarketingLayout header | ✓ Present at [MarketingLayout.jsx:191](frontend/src/components/marketing/MarketingLayout.jsx#L191) |
| MobileTopBar (mobile authenticated) | ✗ Missing — add it |
| Settings → Appearance page | ✗ Need to verify; if missing, add 3-way Light/Dark/System picker |

### `[VISUAL]` items — need browser confirmation

I cannot verify these from code alone. Suggested test matrix:

| Breakpoint | Pages to check |
|------------|----------------|
| 320px | Marketing home, login, mobile drawer open |
| 375px | Same |
| 768px | All marketing pages, app dashboard, settings |
| 1024px | TopBar at this breakpoint (command palette + right cluster) |
| 1280px | Standard desktop |
| 1920px | Wide desktop, marketing hero |

---

## ISSUE 5 — End User vs Agency distinction

### Current state

| Question | Answer |
|----------|--------|
| Where is `account_type` set? | Backend `UserProfile` model with choices `end_user`, `agency_member`, `legacy`. Default: `'legacy'`. |
| Does `useAuth` expose it? | **No.** `/me` endpoint returns it, but the auth hook drops it. |
| Does `useAuth` expose `isEndUser` / `isAgency`? | **No.** Components have to derive. |
| Are there `/u/*` routes? | Yes — [App.js:399-412](frontend/src/App.js#L399-L412), guarded by `roles=['client']`, **not** by `account_type`. |
| Are there `/agency/*` routes? | **No.** Agency-only pages live under `/admin/*`. |
| Is there an `AgencyShell`? | **No.** Agency members share `AppShell` with superadmins/staff. |
| Is there an `AccountTypeBadge` component? | **No.** |
| Does `RootRedirect` use `account_type`? | **No** — see P0 #2. |

### Gaps

1. **P0:** `/admin/billing` and `/admin/marketplace-profile` are gated by `roles=['superadmin','staff']` — agency members (`role='client'`) cannot reach them.
2. **P1:** Add `account_type`, `isEndUser`, `isAgency` to `useAuth()` return value. Should pull from `/me` response.
3. **P1:** Build `AccountTypeBadge` and surface it in [ModuleRail.jsx:275](frontend/src/components/shell/ModuleRail.jsx#L275) (currently shows `user.role` in uppercase) and [UserSettingsPage.jsx](frontend/src/pages/UserSettingsPage.jsx).
4. **P1:** Update `RootRedirect` to route end users to `/u`, agency members to a new `/agency` route, staff/superadmin to `/admin`.
5. **P1:** Decide on agency routing strategy — either:
   - **(a)** Move agency-only pages out of `/admin` to a new `/agency/*` tree with a new `AgencyShell`. Cleanest. ~1 day.
   - **(b)** Keep them under `/admin` but loosen the role guard to `roles=['superadmin','staff','client']` AND add `requiredAccountType='agency_member'` for agency-only pages. Faster but messier.
6. **P2:** Branch `UserSettingsPage` sections by `account_type` — end users see Personal billing, Find an Agency, etc.; agency members see Team Members, Agency Profile, Marketplace Profile.
7. **P2:** Onboarding flow — if `account_type === 'legacy'` or unset, force a "How will you use Statox AI?" picker before letting them into the dashboard. Today, `ClientOnboardingPage` doesn't ask.
8. **P3:** Add an agency signup endpoint + page (mirroring `EndUserSignupPage`) so prospective agencies can sign up directly without an invite.

### Recommended approach for Stage 7

Go with route strategy (a) — cleaner, easier to reason about. Day 1: extend `useAuth`, add `AccountTypeBadge`, fix `RootRedirect`. Day 2: build `AgencyShell` (can be a thin variant of `AppShell` that pre-selects the agency-flavored sidebar) and move agency pages to `/agency/*`. Day 3: branch settings and add onboarding picker.

---

## ISSUE 6 — Global polish (Stage 5)

### Quick wins

- [public/index.html:7](frontend/public/index.html#L7) — meta description is honest but shouldn't say "Built for India + the world" — say "for modern teams" instead. Remove vendor reference.
- [MarketingLayout.jsx:697](frontend/src/components/marketing/MarketingLayout.jsx#L697) — "Made in India 🇮🇳" footer — keep on `/contact` and legal pages where geography is relevant; remove from global footer per the prompt's framing rule (geography is not the story).
- American English sweep — quick `find ... -exec grep` will surface `organisation`, `colour`, `centre`, `analyse`, `favourite`, `cancelled`, `licence` (verb), `grey`. Replace in JSX/JS only — not in `.md` docs.

### Date / number / currency formatting

- Search for raw `toLocaleString` calls — locale should default to `'en-US'` for the unambiguous `Jan 15, 2026` format.
- `date-fns` `format(d, 'MMM d, yyyy')` and `format(d, 'h:mm a')` are the targets.
- USD as primary currency in marketing pricing; keep INR for app billing.

### Truthfulness sweep

I'll surface specific files in Stage 5 — they're not in this audit since they need page-by-page reading to find fabricated counts/testimonials. Initial heuristic search points:

- [HomePage.jsx](frontend/src/pages/HomePage.jsx) — has a "Trusted by ..." section and customer count claim?
- [CustomersPage.jsx](frontend/src/pages/CustomersPage.jsx) — likely lists fake customer logos / testimonials
- [`marketing/blogPosts.js`](frontend/src/pages/marketing/blogPosts.js) — case studies?
- [`marketing/AgenciesShowcasePage.jsx`](frontend/src/pages/marketing/AgenciesShowcasePage.jsx) — agency listings?
- Footer trust strip in MarketingLayout

Stage 5 should be a careful pass of these specific files, replacing fabricated claims with truthful framing.

---

## Stage-by-stage recap (proposed)

| Stage | Effort | Pause-and-review checkpoint |
|-------|--------|-----------------------------|
| 2: Theme system | 4-6h | After bulk replace + `[VISUAL]` walkthrough on 10 pages |
| 3: Platform cleanup | 2-3h | After grep confirms zero unsupported references |
| 4: Branding (Statox AI) | 2h | After meta tags + manifest + footer + 26 strings updated |
| 5: Global polish + truthfulness | 6-8h | After American-English sweep + truthfulness review of marketing pages |
| 6: Header bugs (active components only) | 3-4h | After mega-menu grace period, TopBar flex-shrink, dropdown viewport guards, mobile theme toggle, focus trap |
| 7: End-user vs agency | 1-2 days | After P0 fix, AgencyShell built, AccountTypeBadge live, settings branched |
| 8: Final QA | 4h | After cross-browser + cross-account-type pass |

**Total estimate:** 4-5 working days for the full sweep, depending on how much manual visual QA you do at each pause.

---

## Items needing your call before I start Stage 2

1. **Loader splash** — should it always be dark (current behaviour, intentional brand moment)? Or should it adapt to theme? My recommendation: adapt to theme so it doesn't flash dark on a light-default reload.
2. **Marketing hero gradients** — keep gradient + light text identical across themes (recommended), or invert in dark mode?
3. **Integrations page AI vendor cards** — is "BYOK Anthropic Claude / OpenAI / Gemini" a real shipping feature? If yes, those cards stay. If no, they go.
4. **Agency routing strategy** — option (a) clean `/agency/*` split, or option (b) keep under `/admin/*` with relaxed role guards? I recommend (a).
5. **Legacy header components** (`Sidebar.jsx`, `BottomNav.jsx`, `MobileHeader.jsx`) — confirm they're dead code? If yes, delete in Stage 6 and skip the theme fix.
6. **"Made in India" footer line** — keep on contact/legal only, or keep globally?

Once you've reviewed and answered the open questions, I'll start Stage 2 (theme fixes) and pause for screenshots.
