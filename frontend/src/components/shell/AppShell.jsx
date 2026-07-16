/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BarChart3, MessageCircle, Target, Menu, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRealtime } from '../../hooks/useRealtime';

import ModuleRail from './ModuleRail';
import FeatureSidebar, { getFeatureSidebarMeta } from './FeatureSidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import MobileNav from './MobileNav';
import AIFloatingTrigger from '../ai/AIFloatingTrigger';
import SkipLink from '../ui/SkipLink';
import ThemeToggle from '../ui/ThemeToggle';
import WorkspaceSwitcher from '../workspace/WorkspaceSwitcher';
import { CollapsibleRail, RailHeader } from '../common/CollapsibleRail';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useAuth } from '../../hooks/useAuth';
import useWorkspace from '../../hooks/useWorkspace';
import { useCurrentClientId } from '../../stores/appStore';

import '../../styles/scss/topbar.scss';
import '../../styles/scss/workspace-switcher.scss';
import '../../styles/scss/feature-sidebar.scss';
import '../../styles/base/_themes.scss';

/**
 * Root layout shell. Replaces the inline layout logic in App.js.
 *
 * Props:
 * children: routed content (already wrapped in <Routes>)
 * isAdmin: bool — admin sees all 3 modules; client sees a filtered set
 */
export default function AppShell({ children, isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { isMobile } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const workspaceId = useCurrentClientId();
  // Hydrate workspace list once for the shell (TopBar / MobileTopBar read the store)
  useWorkspace({ user, autoHydrate: true });

  const basePath = isAdmin ? '/admin' : '/dashboard';
  const currentModule = useMemo(() => deriveModule(location.pathname, basePath), [location.pathname, basePath]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Surface live events as toasts. Pages can also subscribe directly to
  // useRealtime() to refetch their own data on relevant events.
  useRealtime((event) => {
    if (!event || !event.type) return;
    const d = event.data || {};
    switch (event.type) {
      case 'composer.post_published':
        toast.success(`Published: ${d.title || 'post'}`);
        break;
      case 'composer.post_partial':
        toast(`Published partially (${d.success_count}/${(d.success_count||0) + (d.failed_count||0)})`,
              { icon: '⚠️' });
        break;
      case 'composer.post_failed':
        toast.error(`Publish failed: ${d.title || 'post'}`);
        break;
      case 'inbox.new_message':
        if (d.preview) {
          toast(`💬 ${d.contact_name || 'New message'}: ${String(d.preview).slice(0, 80)}`,
                { duration: 3500 });
        }
        break;
      case 'inbox.new_review':
        toast(`⭐ New ${d.rating || ''}-star review${d.reviewer_name ? ' from ' + d.reviewer_name : ''}`,
              { duration: 4000 });
        break;
      case 'credential.token_expired':
        toast.error(`${d.platform || 'Platform'} token expired — please reconnect.`,
                    { duration: 6000 });
        break;
      default:
        // Other events propagate silently; pages handle them via their own subscribers.
        break;
    }
  });

  // Build module list, filtered by role/perms
  const modules = useMemo(() => {
    const all = [
      {
        id: 'analytics', label: 'Analytics', icon: BarChart3,
        enabled: true,  // always available
      },
      {
        id: 'messaging', label: 'Messaging', icon: MessageCircle,
        enabled: isAdmin || can?.('whatsapp.view'),
      },
      {
        id: 'ads', label: 'Ads', icon: Target,
        enabled: false, comingSoon: true,
      },
    ];
    return all.filter((m) => m.enabled || m.comingSoon || isAdmin);
  }, [isAdmin, can]);

  const showRail    = !isMobile;
  const showSidebar = !isMobile;
  const sidebarMeta = useMemo(
    () => getFeatureSidebarMeta(currentModule),
    [currentModule],
  );
  const SidebarIcon = sidebarMeta.Icon;

  return (
    <div className="ds-app-shell">
      <SkipLink targetId="main-content" />

      {showRail && (
        <ModuleRail
          currentModule={currentModule}
          basePath={basePath}
          modules={modules}
        />
      )}

      {showSidebar && (
        <CollapsibleRail
          shellLayout
          persist
          defaultExpanded
          ariaLabel={`${sidebarMeta.label} navigation`}
          header={(
            <RailHeader
              title={sidebarMeta.label}
              subtitle={sidebarMeta.subtitle}
              icon={SidebarIcon ? <SidebarIcon size={15} strokeWidth={2.4} /> : null}
            />
          )}
        >
          <FeatureSidebar
            module={currentModule}
            basePath={basePath}
            embedded
          />
        </CollapsibleRail>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <MobileDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          modules={modules}
          currentModule={currentModule}
          basePath={basePath}
        />
      )}

      {!isMobile && (
        <TopBar
          basePath={basePath}
          module={currentModule}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      )}

      {isMobile && (
        <MobileTopBar
          basePath={basePath}
          onMenuOpen={() => setMobileMenuOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      )}

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${workspaceId || 'none'}:${location.pathname}`}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {isMobile && <MobileNav module={currentModule} basePath={basePath} />}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        basePath={basePath}
      />

      {/* Floating Social Stats assistant — global Cmd/Ctrl+J */}
      <AIFloatingTrigger />
    </div>
  );
}

function MobileTopBar({ basePath, onMenuOpen, onOpenPalette }) {
  const { user } = useAuth();
  const {
    workspace,
    workspaces,
    loading,
    switchWorkspace,
  } = useWorkspace({ user, autoHydrate: false });
  const initial = ((user?.name || user?.email || 'U').trim()[0] || 'U').toUpperCase();
  const hue = hashHue(user?.email || user?.name || '');

  return (
    <header className="ds-mobile-topbar" role="banner">
      <button type="button" className="ds-mobile-topbar__btn" onClick={onMenuOpen} aria-label="Open menu">
        <Menu size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="ds-mobile-topbar__workspace">
        <WorkspaceSwitcher
          workspace={workspace}
          workspaces={workspaces}
          loading={loading}
          onSwitch={switchWorkspace}
          compact
          align="center"
        />
      </div>

      <button
        type="button"
        className="ds-mobile-topbar__btn"
        onClick={onOpenPalette}
        aria-label="Search"
      >
        <Search size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      <ThemeToggle size="sm" />

      <div
        className="ds-mobile-topbar__avatar"
        style={{ '--ds-avatar-hue': hue }}
        aria-hidden="true"
      >
        {initial}
      </div>
    </header>
  );
}

function MobileDrawer({ open, onClose, modules, currentModule, basePath }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Esc to close + Tab focus trap (so the drawer behaves like a real dialog
  // when open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the drawer on open.
    const t = setTimeout(() => {
      const first = drawerRef.current?.querySelector('button, [href]');
      first?.focus?.();
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`mobile-drawer-backdrop ${open ? 'open' : ''}`}
        aria-hidden
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0, bottom: 0,
          left: 0,
          width: 'min(82vw, 320px)',
          zIndex: 300,
          background: 'var(--surface-card)',
          borderRight: '1px solid var(--border-subtle)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-default)',
          display: 'flex', flexDirection: 'column',
          boxShadow: open ? 'var(--shadow-lg)' : 'none',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Navigation</strong>
          <button type="button" onClick={onClose} aria-label="Close menu" style={iconBtn}>
            <X size={16} />
          </button>
        </header>

        {/* Module switcher */}
        <div style={{
          padding: '10px 12px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {modules.map((m) => {
            const Icon = m.icon;
            const active = m.id === currentModule;
            const disabled = !m.enabled || m.comingSoon;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) { navigate(`${basePath}/${m.id}`); onClose(); } }}
                style={{
                  padding: 12,
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--brand-gradient)' : 'var(--surface-sunken)',
                  color: active ? '#fff' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  minHeight: 'unset',
                }}
              >
                <Icon size={18} />
                {m.label}
                {m.comingSoon && <span style={{ fontSize: 9, opacity: 0.7 }}>SOON</span>}
              </button>
            );
          })}
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <FeatureSidebar module={currentModule} basePath={basePath} embedded />
        </div>
      </div>
    </>
  );
}

function deriveModule(pathname, basePath) {
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const seg = rest.split('/').filter(Boolean)[0];
  if (seg === 'analytics' || seg === 'messaging' || seg === 'ads') return seg;
  return 'analytics';  // default
}

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

const iconBtn = {
  width: 36, height: 36,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  flexShrink: 0,
  minHeight: 'unset', minWidth: 'unset',
  padding: 0,
};
