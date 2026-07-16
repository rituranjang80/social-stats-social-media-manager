/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useLocation, Link } from 'react-router-dom';
import { Search, Sparkles, ChevronRight } from 'lucide-react';

import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../ui/NotificationBell';
import WorkspaceSwitcher from '../workspace/WorkspaceSwitcher';
import useWorkspace from '../../hooks/useWorkspace';
import { useAuth } from '../../hooks/useAuth';

import '../../styles/scss/topbar.scss';
import '../../styles/scss/workspace-switcher.scss';

/**
 * 56px-tall top bar.
 * Left: breadcrumb · Center: Switch Workspace · Right: search / theme / alerts
 */
export default function TopBar({
  basePath,
  module,
  onOpenPalette,
}) {
  const location = useLocation();
  const { user } = useAuth();
  const {
    workspace,
    workspaces,
    loading,
    switchWorkspace,
  } = useWorkspace({ user, autoHydrate: false });
  const crumbs = buildBreadcrumbs(location.pathname, basePath);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <header className="ds-topbar" role="banner">
      <nav className="ds-topbar__crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="ds-topbar__crumb">
            {i > 0 && <ChevronRight size={12} className="ds-topbar__crumb-sep" aria-hidden="true" />}
            {i === crumbs.length - 1 ? (
              <span className="ds-topbar__crumb-current">{c.label}</span>
            ) : c.to ? (
              <Link to={c.to} className="ds-topbar__crumb-link">{c.label}</Link>
            ) : (
              <span className="ds-topbar__crumb-muted">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="ds-topbar__workspace">
        <WorkspaceSwitcher
          workspace={workspace}
          workspaces={workspaces}
          loading={loading}
          onSwitch={switchWorkspace}
          align="center"
        />
      </div>

      <div className="ds-topbar__actions">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette (Cmd+K)"
          className="ds-topbar-search"
        >
          <Search size={14} aria-hidden="true" />
          <span className="ds-topbar-search__label">Search anything…</span>
          <kbd className="ds-topbar-search__kbd">
            {isMac ? '⌘' : 'Ctrl'}K
          </kbd>
        </button>

        <ThemeToggle size="sm" />
        <NotificationBellWrapper />

        <Link
          to="/changelog"
          target="_blank"
          rel="noopener noreferrer"
          className="ds-whats-new"
          aria-label="What's new"
        >
          <Sparkles size={11} aria-hidden="true" />
          New
        </Link>
      </div>
    </header>
  );
}

function NotificationBellWrapper() {
  try {
    return <NotificationBell />;
  } catch {
    return null;
  }
}

function buildBreadcrumbs(pathname, basePath) {
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const parts = rest.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];

  const out = [];
  let acc = basePath;
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    out.push({
      label: humanize(parts[i]),
      to: i < parts.length - 1 ? acc : undefined,
    });
  }
  return out;
}

function humanize(seg) {
  if (/^\d+$/.test(seg)) return `#${seg}`;
  return seg
    .replace(/-|_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
