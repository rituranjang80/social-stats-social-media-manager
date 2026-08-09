/* ============================================================================
 * Global Switch Workspace — top-nav control for the active Client.
 * Admin: searchable list + link to manage / create workspaces.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Layers, Plus, Search } from 'lucide-react';

import '../../styles/scss/workspace-switcher.scss';
import { ALL_WORKSPACES, isAllWorkspacesId } from '../../constants/workspace';

function matchesQuery(workspace, q) {
  if (!q) return true;
  const hay = [
    workspace?.label,
    workspace?.company,
    workspace?.name,
    workspace?.slug,
    workspace?.id != null ? String(workspace.id) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export default function WorkspaceSwitcher({
  workspace,
  workspaces = [],
  loading = false,
  onSwitch,
  disabled = false,
  compact = false,
  align = 'center',
  isAdmin = false,
  newWorkspaceTo = '/admin/clients',
  includeAllWorkspaces = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const canSwitch = isAdmin
    ? !disabled && !loading
    : !disabled && workspaces.length > 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces.filter((w) => matchesQuery(w, q));
  }, [workspaces, query]);

  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open && isAdmin) {
      const t = setTimeout(() => searchRef.current?.focus?.(), 0);
      return () => clearTimeout(t);
    }
    if (!open) setQuery('');
    return undefined;
  }, [open, isAdmin]);

  if (!workspace && !loading && workspaces.length === 0 && !isAdmin) {
    return (
      <div
        className={`ws-switcher ws-switcher--empty ${compact ? 'ws-switcher--compact' : ''}`}
        role="status"
      >
        <Layers size={14} aria-hidden="true" />
        <span>No workspace</span>
      </div>
    );
  }

  const isAllActive = isAllWorkspacesId(workspace?.id);

  const openMenu = () => {
    if (canSwitch) setOpen((v) => !v);
  };

  return (
    <div
      className={[
        'ws-switcher',
        compact ? 'ws-switcher--compact' : '',
        align === 'left' ? 'ws-switcher--align-left' : '',
        isAdmin ? 'ws-switcher--admin' : '',
        open ? 'is-open' : '',
      ].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <button
        type="button"
        className="ws-switcher__btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch workspace"
        disabled={!canSwitch}
        onClick={openMenu}
      >
        <span className="ws-switcher__avatar" aria-hidden="true">
          {workspace?.logo ? (
            <img src={workspace.logo} alt="" />
          ) : (
            <span>{workspace?.initial || 'W'}</span>
          )}
        </span>
        <span className="ws-switcher__label">
          <span className="ws-switcher__eyebrow">
            {canSwitch ? 'Switch workspace' : 'Workspace'}
          </span>
          <span className="ws-switcher__name">
            {loading ? 'Loading…' : (workspace?.label || (isAdmin ? 'Select workspace' : 'Workspace'))}
          </span>
        </span>
        {canSwitch && (
          <ChevronDown size={14} className="ws-switcher__chevron" aria-hidden="true" />
        )}
      </button>

      {open && canSwitch && (
        <div className="ws-switcher__menu" role="listbox" aria-label="Workspaces">
          {isAdmin && (
            <div className="ws-switcher__search-wrap">
              <Search size={14} className="ws-switcher__search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                className="ws-switcher__search"
                placeholder="Search workspaces…"
                value={query}
                aria-label="Search workspaces"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="ws-switcher__list">
            {includeAllWorkspaces && isAdmin && (
              <button
                type="button"
                role="option"
                aria-selected={isAllActive}
                className={`ws-switcher__option ${isAllActive ? 'is-active' : ''}`}
                onClick={() => {
                  setOpen(false);
                  if (!isAllActive) onSwitch?.(ALL_WORKSPACES);
                }}
              >
                <span className="ws-switcher__avatar" aria-hidden="true">A</span>
                <span className="ws-switcher__option-name">All workspaces</span>
                {isAllActive && <span className="ws-switcher__badge">Current</span>}
              </button>
            )}

            {filtered.length === 0 && !(includeAllWorkspaces && isAdmin) ? (
              <p className="ws-switcher__empty-hint" role="status">
                {workspaces.length === 0
                  ? 'No workspaces yet.'
                  : 'No workspaces match your search.'}
              </p>
            ) : (
              filtered.map((w) => {
                const active = String(w.id) === String(workspace?.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`ws-switcher__option ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setOpen(false);
                      if (!active) onSwitch?.(w);
                    }}
                  >
                    <span className="ws-switcher__avatar" aria-hidden="true">
                      {w.logo ? <img src={w.logo} alt="" /> : w.initial}
                    </span>
                    <span className="ws-switcher__option-name">{w.label}</span>
                    {active && <span className="ws-switcher__badge">Current</span>}
                  </button>
                );
              })
            )}
          </div>

          {isAdmin && (
            <>
              <hr className="ws-switcher__sep" aria-hidden="true" />
              <Link
                to={newWorkspaceTo}
                className="ws-switcher__new"
                onClick={() => setOpen(false)}
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                New workspace
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
