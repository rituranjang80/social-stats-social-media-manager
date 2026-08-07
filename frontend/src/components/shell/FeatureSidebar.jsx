/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, MessageCircle, Target,
  LayoutDashboard, LineChart, FileText, FileType, CalendarDays, Wand2, Lightbulb, Hash,
  TrendingUp, AlertCircle, FolderSync,
  Inbox, Send, Users2, ListChecks, Settings, Webhook,
  Rocket,
  PenSquare, Layers, Images,
  Star,
  Zap, Film,
  Bell, ShieldCheck, ClipboardCheck, Link2,
  Mic, Sparkles,
  Bot, MessageSquare, Megaphone, UserPlus,
  Briefcase, Store, LogOut,
} from 'lucide-react';

import brand, { BRAND_NAME } from '../../config/brand';
import PermissionGate from '../ui/PermissionGate';
import ComposerConnectChannels from '../composer/ComposerConnectChannels';
import { useBadgeCount } from '../../stores/appStore';
import { useAuth } from '../../hooks/useAuth';
import useWorkspace from '../../hooks/useWorkspace';
import { clientSettingsPath } from '../../utils/workspacePaths';

function AnalyticsNavIcon({ size = 15, strokeWidth = 2.4 }) {
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    );
  }
  return <BarChart3 size={size} strokeWidth={strokeWidth} />;
}

function resolveNavPath(item, basePath, module, settingsPath) {
  if (item.pathKey === 'settings') return settingsPath;
  if (item.path.startsWith('/admin/') || item.path.startsWith('/dashboard/')) return item.path;
  return `${basePath}/${module}${item.path}`;
}

/** Module list formerly rendered in ModuleRail (Analytics / Messaging / Ads). */
export function buildShellModules({ isAdmin, can }) {
  const all = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, enabled: true },
    {
      id: 'messaging',
      label: 'Messaging',
      icon: MessageCircle,
      enabled: isAdmin || can?.('whatsapp.view'),
    },
    { id: 'ads', label: 'Ads', icon: Target, enabled: false, comingSoon: true },
  ];
  return all.filter((m) => m.enabled || m.comingSoon || isAdmin);
}

/**
 * Feature sidebar nav. When `embedded`, renders scroll content only
 * (header + chrome come from CollapsibleRail in AppShell).
 */
export default function FeatureSidebar({
  module,
  basePath,
  embedded = false,
  modules = [],
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const { workspace, workspaceId, workspaceRef } = useWorkspace({ user, autoHydrate: false });

  const navSet = NAV_SETS[module] || NAV_SETS.analytics;
  const showChannels = module === 'analytics';
  const shellModules = modules.length ? modules : buildShellModules({ isAdmin: basePath === '/admin', can });

  const settingsPath = useMemo(
    () => clientSettingsPath(basePath, workspace),
    [basePath, workspace],
  );

  const body = (
    <div className={`sidebar-scroll${embedded ? ' sidebar-scroll--embedded' : ''}`}>
      {/* <Section title="Modules">
        {shellModules.map((m) => (
          <ModuleNavItem
            key={m.id}
            module={m}
            active={module === m.id}
            onSelect={() => {
              if (!m.enabled || m.comingSoon) return;
              navigate(`${basePath}/${m.id}`);
            }}
          />
        ))}
      </Section> */}

      {navSet.empty ? (
        <EmptyModule message={navSet.empty} />
      ) : (
        navSet.sections.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <PermissionGate key={`${section.title}-${item.label}`} code={item.permission}>
                <NavItem
                  to={resolveNavPath(item, basePath, module, settingsPath)}
                  icon={item.icon}
                  label={item.label}
                  end={item.end}
                  badge={item.badge}
                  badgeKey={item.badgeKey}
                  pathname={location.pathname}
                  disabled={item.disabled}
                />
              </PermissionGate>
            ))}
            {showChannels && section.title === 'Publish' ? (
              <ComposerConnectChannels
                clientId={workspaceRef || workspaceId}
                settingsPath={settingsPath}
                compact
              />
            ) : null}
          </Section>
        ))
      )}

      <Section title="Account">
        <NavItem
          to={`${basePath}/analytics/alerts`}
          icon={Bell}
          label="Notifications"
          pathname={location.pathname}
        />
        <NavItem
          to={`${basePath}/account-settings`}
          icon={Settings}
          label="Account settings"
          pathname={location.pathname}
        />
        {user?.account_type === 'agency_member' ? (
          <>
            <NavItem to="/agency" icon={Briefcase} label="Manage agency" pathname={location.pathname} />
            <NavItem
              to="/agency/marketplace-profile"
              icon={Store}
              label="Marketplace profile"
              pathname={location.pathname}
            />
          </>
        ) : null}
        {user?.account_type === 'end_user' ? (
          <NavItem to="/u/agency" icon={Briefcase} label="My agency" pathname={location.pathname} />
        ) : null}
        <ActionNavItem
          icon={LogOut}
          label="Sign out"
          danger
          onClick={() => {
            logout();
            navigate('/login');
          }}
        />
      </Section>
    </div>
  );

  if (embedded) {
    return body;
  }

  const HeaderIcon = navSet.icon;

  return (
    <aside className="ds-feature-sidebar" aria-label={`${module} navigation`}>
      <header className="ds-feature-sidebar__header">
        <div className="ds-feature-sidebar__icon">
          {HeaderIcon ? <HeaderIcon size={15} strokeWidth={2.4} /> : null}
        </div>
        <div>
          <div className="ds-feature-sidebar__label">{navSet.label ?? BRAND_NAME}</div>
          {navSet.subtitle ? (
            <div className="ds-feature-sidebar__subtitle">{navSet.subtitle}</div>
          ) : null}
        </div>
      </header>
      {body}
    </aside>
  );
}

export function getFeatureSidebarMeta(module) {
  const navSet = NAV_SETS[module] || NAV_SETS.analytics;
  return {
    label: navSet.label ?? BRAND_NAME,
    subtitle: navSet.subtitle,
    Icon: navSet.icon,
  };
}

function ModuleNavItem({ module: m, active, onSelect }) {
  const Icon = m.icon;
  const disabled = !m.enabled || m.comingSoon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      style={{
        ...navItemBase,
        width: '100%',
        border: 'none',
        fontFamily: 'inherit',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--brand-primary-glow)' : 'transparent',
        boxShadow: active ? 'inset 2px 0 0 var(--brand-primary)' : 'none',
        fontWeight: active ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (active || disabled) return;
        e.currentTarget.style.background = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (active || disabled) return;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={16} strokeWidth={2} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>{m.label}</span>
      {m.comingSoon ? (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 5px',
          borderRadius: 999, background: 'var(--warning)', color: '#fff',
        }}
        >
          SOON
        </span>
      ) : null}
    </button>
  );
}

function ActionNavItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...navItemBase,
        width: '100%',
        border: 'none',
        fontFamily: 'inherit',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        background: 'transparent',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={16} strokeWidth={2} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>{label}</span>
    </button>
  );
}

function NavItem({ to, icon: Icon, label, end, badge, badgeKey, pathname, disabled }) {
  const liveBadge = useBadgeCount(badgeKey || '__none__');
  const effectiveBadge = badge ?? (badgeKey ? liveBadge : 0);
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  if (disabled) {
    return (
      <div style={{
        ...navItemBase,
        color: 'var(--text-tertiary)',
        cursor: 'not-allowed',
        opacity: 0.55,
      }}
      >
        <Icon size={16} strokeWidth={2} />
        <span style={{ flex: 1 }}>{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      style={{
        ...navItemBase,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--brand-primary-glow)' : 'transparent',
        boxShadow: isActive ? 'inset 2px 0 0 var(--brand-primary)' : 'none',
        fontWeight: isActive ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={16} strokeWidth={2} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {!!effectiveBadge && effectiveBadge > 0 && (
        <span style={{
          minWidth: 18, padding: '0 5px',
          background: 'var(--brand-primary-hover)', color: '#fff',
          fontSize: 10, fontWeight: 700, lineHeight: '16px', height: 16,
          borderRadius: 999, textAlign: 'center',
        }}
        >
          {effectiveBadge > 99 ? '99+' : effectiveBadge}
        </span>
      )}
    </NavLink>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'var(--text-tertiary)',
        padding: '6px 10px 8px',
      }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyModule({ message }) {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
      fontSize: 12,
    }}
    >
      <Rocket size={28} strokeWidth={1.5} style={{ marginBottom: 8 }} />
      <div>{message}</div>
    </div>
  );
}

const navItemBase = {
  display: 'flex', alignItems: 'center', gap: 10,
  height: 36, padding: '0 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, fontWeight: 500,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'var(--transition-fast)',
};

const NAV_SETS = {
  analytics: {
    label: undefined,
    subtitle: 'Analytics & content',
    icon: AnalyticsNavIcon,
    sections: [
      {
        title: 'Publish',
        items: [
          { label: 'Composer', icon: PenSquare, path: '/composer', permission: 'composer.view' },
          { label: 'Calendar', icon: CalendarDays, path: '/calendar', permission: 'calendar.view' },
    //      { label: 'Queues', icon: Layers, path: '/queues', permission: 'composer.view' },
          { label: 'Media Library', icon: Images, path: '/media', permission: 'composer.view' },
          { label: 'Video Studio', icon: Film, path: '/video', permission: 'video.view' },
        ],
      },
      // {
      //   title: 'Engage',
      //   items: [
      //     {
      //       label: 'Inbox',
      //       icon: Inbox,
      //       path: '/inbox',
      //       permission: 'inbox.view',
      //       badgeKey: 'unread_inbox',
      //     },
      //     { label: 'Reviews', icon: Star, path: '/reviews', permission: 'inbox.view' },
      //     { label: 'Automations', icon: Zap, path: '/automations', permission: 'automations.view' },
      //   ],
      // },
      {
        title: 'Overview',
        items: [
          // {
          //   label: 'Dashboard',
          //   icon: LayoutDashboard,
          //   path: '/dashboard',
          //   end: true,
          //   permission: 'dashboard.view',
          // },
          { label: 'Analytics', icon: LineChart, path: '/analytics', permission: 'analytics.view' },
          { label: 'Reports', icon: FileText, path: '/reports', permission: 'reports.view' },
        ],
      },
      // {
      //   title: 'Content',
      //   items: [
      //     { label: 'Posts', icon: FileType, path: '/posts', permission: 'dashboard.posts_table' },
      //     { label: 'Caption Writer', icon: Wand2, path: '/caption-writer' },
      //     { label: 'Post Ideas', icon: Lightbulb, path: '/post-ideas' },
      //     { label: 'Hashtags', icon: Hash, path: '/hashtags' },
      //     { label: 'AI Studio', icon: Sparkles, path: '/ai-studio' },
      //     { label: 'Brand Voice', icon: Mic, path: '/brand-voice', permission: 'ai.brand_voice' },
      //     { label: 'AI Insights', icon: Sparkles, path: '/insights' },
      //     { label: 'AI Audit', icon: ShieldCheck, path: '/ai-audit' },
      //   ],
      // },
      // {
      //   title: 'Performance',
      //   items: [
      //     { label: 'ROI Calculator', icon: TrendingUp, path: '/roi', permission: 'roi.view' },
      //     { label: 'Alerts', icon: AlertCircle, path: '/alerts', permission: 'alerts.view' },
      //     { label: 'Sync Logs', icon: FolderSync, path: '/synclogs' },
      //   ],
      // },
      // {
      //   title: 'Grow',
      //   items: [
      //     { label: 'Audience', icon: Users2, path: '/audience', permission: 'audience.view' },
      //     { label: 'Competitors', icon: TrendingUp, path: '/competitors', permission: 'competitors.view' },
      //   ],
      // },
      {
        title: 'Setup',
        items: [
           {
             label: 'Approvals',
             icon: ClipboardCheck,
             path: '/approvals',
             permission: 'composer.approve',
             badgeKey: 'pending_approvals',
           },
          {
            label: 'Manage connections',
            icon: Link2,
            pathKey: 'settings',
            permission: 'composer.view',
          },
          // {
          //   label: 'Notifications',
          //   icon: Bell,
          //   path: '/notifications',
          //   badgeKey: 'unread_notifications',
          // },
          // { label: 'Audit Log', icon: ShieldCheck, path: '/audit-log', permission: 'audit.view' },
        ],
      },
    ],
  },

  messaging: {
    label: 'Messaging',
    subtitle: 'WhatsApp & SMS',
    icon: Inbox,
    sections: [
      {
        title: 'Inbox',
        items: [
          { label: 'All conversations', icon: Inbox, path: '/inbox', permission: 'whatsapp.view_inbox' },
        ],
      },
      // {
      //   title: 'Outreach',
      //   items: [
      //     { label: 'Campaigns', icon: Send, path: '/campaigns', permission: 'whatsapp.manage_campaigns' },
      //     { label: 'Templates', icon: FileType, path: '/templates', permission: 'whatsapp.manage_templates' },
      //     { label: 'Contacts', icon: Users2, path: '/contacts', permission: 'whatsapp.manage_contacts' },
      //     { label: 'Lists', icon: ListChecks, path: '/lists', permission: 'whatsapp.manage_contacts' },
      //   ],
      // },
      // {
      //   title: 'Conversational AI',
      //   items: [
      //     { label: 'Bot Flows', icon: Bot, path: '/admin/bot-flows', permission: 'bot.view' },
      //     { label: 'Conversations', icon: MessageSquare, path: '/admin/conversations', permission: 'bot.view' },
      //     { label: 'Handoff Queue', icon: UserPlus, path: '/admin/handoff', permission: 'bot.view' },
      //     {
      //       label: 'Leads',
      //       icon: Users2,
      //       path: '/admin/leads',
      //       permission: 'leads.view',
      //       badgeKey: 'new_leads',
      //     },
      //     { label: 'CTWA Campaigns', icon: Megaphone, path: '/admin/ctwa', permission: 'ctwa.view' },
      //     { label: 'Templates', icon: Sparkles, path: '/admin/bot-templates', permission: 'bot.view' },
      //     { label: 'Bot Safety', icon: ShieldCheck, path: '/admin/bot-settings', permission: 'bot.view' },
      //   ],
      // },
      {
        title: 'Setup',
        items: [
          { label: 'Account', icon: Settings, path: '/account', permission: 'whatsapp.manage_account' },
          { label: 'Webhooks', icon: Webhook, path: '/account#webhooks', disabled: true },
        ],
      },
    ],
  },

  ads: {
    label: 'Ads',
    subtitle: 'Coming soon',
    icon: Rocket,
    empty: 'Ads management is coming soon. We\'re building it next.',
    sections: [],
  },
};
