/* ============================================================================
 * Multi-workspace & Teams rail — Org → Workspace → Members hierarchy.
 * Inspired by unlimited organizations/workspaces with RBAC & invitations.
 * Wire to real Agency (org) + Client (workspace) APIs — no fake roster.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, ChevronDown, ChevronRight, Users, Shield, Mail,
  Layers, UserPlus, Briefcase, Settings2,
} from 'lucide-react';

export default function ComposerWorkspaceRail({ tenant, compact = false }) {
  if (!tenant) return null;

  const {
    loading,
    organization,
    workspace,
    workspaces,
    roleLabel,
    capabilities,
    links,
    memberHint,
  } = tenant;

  return (
    <aside
      className={`composer-rail ${compact ? 'composer-rail--compact' : ''}`}
      aria-label="Organization, workspace and team"
    >
      {/* Org → Workspace hierarchy */}
      <div className="composer-tenant">
        <p className="composer-tenant__caption">Multi-workspace &amp; Teams</p>

        <div className="composer-tenant__tree" aria-label="Tenant hierarchy">
          <div className="composer-tenant__node composer-tenant__node--org">
            <span className="composer-tenant__mark" aria-hidden="true">
              {organization.logo ? (
                <img src={organization.logo} alt="" />
              ) : (
                <Building2 size={14} />
              )}
            </span>
            <div className="composer-tenant__node-text">
              <span className="composer-tenant__level">Organization</span>
              <strong className="composer-tenant__value">
                {loading ? 'Loading…' : organization.label}
              </strong>
              {organization.slug && (
                <span className="composer-tenant__slug">@{organization.slug}</span>
              )}
            </div>
          </div>

          <div className="composer-tenant__connector" aria-hidden="true" />

          <div className="composer-tenant__node composer-tenant__node--ws">
            <span className="composer-tenant__mark composer-tenant__mark--ws" aria-hidden="true">
              {workspace.logo ? (
                <img src={workspace.logo} alt="" />
              ) : (
                <span>{workspace.initial}</span>
              )}
            </span>
            <div className="composer-tenant__node-text">
              <span className="composer-tenant__level">Workspace</span>
              <strong className="composer-tenant__value">
                {loading ? 'Loading…' : workspace.label}
              </strong>
            </div>
          </div>

          <div className="composer-tenant__connector" aria-hidden="true" />

          <div className="composer-tenant__node composer-tenant__node--members">
            <span className="composer-tenant__mark composer-tenant__mark--members" aria-hidden="true">
              <Users size={14} />
            </span>
            <div className="composer-tenant__node-text">
              <span className="composer-tenant__level">Members</span>
              <strong className="composer-tenant__value">
                {roleLabel || 'Team access'}
              </strong>
              <span className="composer-tenant__hint">{memberHint}</span>
            </div>
          </div>
        </div>

        {workspaces.length > 1 && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            manageTo={links.workspaces}
          />
        )}
      </div>

      {/* Capabilities */}
      <div className="composer-rail__section">
        <h3 className="composer-rail__section-title">
          <Shield size={13} aria-hidden="true" />
          Access &amp; collaboration
        </h3>
        <ul className="composer-caps">
          {capabilities.map((cap) => (
            <li key={cap.id}>
              <Link to={cap.to} className="composer-caps__item">
                <span className="composer-caps__icon" aria-hidden="true">
                  {cap.id === 'rbac' && <Shield size={13} />}
                  {cap.id === 'roles' && <Briefcase size={13} />}
                  {cap.id === 'invites' && <Mail size={13} />}
                  {cap.id === 'client-role' && <UserPlus size={13} />}
                </span>
                <span className="composer-caps__body">
                  <span className="composer-caps__title">
                    {cap.title}
                    {cap.badge ? (
                      <span className="composer-caps__badge">{cap.badge}</span>
                    ) : null}
                  </span>
                  <span className="composer-caps__detail">{cap.detail}</span>
                </span>
                <ChevronRight size={14} className="composer-caps__chevron" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="composer-rail__actions">
          <Link to={links.settings} className="composer-rail__link">
            <Settings2 size={13} aria-hidden="true" />
            Workspace settings
          </Link>
          <Link to={links.workspaces} className="composer-rail__link composer-rail__link--muted">
            <Layers size={13} aria-hidden="true" />
            All workspaces
          </Link>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({ workspaces, manageTo }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = workspaces.find((w) => w.active) || workspaces[0];

  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="composer-ws-switch" ref={rootRef}>
      <button
        type="button"
        className={`composer-ws-switch__btn ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={14} aria-hidden="true" />
        <span className="composer-ws-switch__label">
          <span className="composer-ws-switch__eyebrow">Switch workspace</span>
          <span className="composer-ws-switch__name">{active?.label}</span>
        </span>
        <span className="composer-ws-switch__count">{workspaces.length}</span>
        <ChevronDown size={14} className="composer-ws-switch__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="composer-ws-switch__menu" role="listbox" aria-label="Workspaces">
          {workspaces.slice(0, 8).map((w) => (
            <Link
              key={w.id}
              role="option"
              aria-selected={w.active}
              to={manageTo}
              className={`composer-ws-switch__option ${w.active ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="composer-ws-switch__avatar" aria-hidden="true">
                {w.logo ? <img src={w.logo} alt="" /> : w.initial}
              </span>
              <span className="composer-ws-switch__option-name">{w.label}</span>
              {w.active && <span className="composer-badge">Current</span>}
            </Link>
          ))}
          {workspaces.length > 8 && (
            <Link to={manageTo} className="composer-ws-switch__more" onClick={() => setOpen(false)}>
              View all {workspaces.length} workspaces
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
