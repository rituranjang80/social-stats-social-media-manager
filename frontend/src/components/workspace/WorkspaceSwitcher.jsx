/* ============================================================================
 * Global Switch Workspace — top-nav control for the active Client.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';

import '../../styles/scss/workspace-switcher.scss';

export default function WorkspaceSwitcher({
  workspace,
  workspaces = [],
  loading = false,
  onSwitch,
  disabled = false,
  compact = false,
  align = 'center',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const canSwitch = !disabled && workspaces.length > 1;

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

  if (!workspace && !loading && workspaces.length === 0) {
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

  return (
    <div
      className={[
        'ws-switcher',
        compact ? 'ws-switcher--compact' : '',
        align === 'left' ? 'ws-switcher--align-left' : '',
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
        disabled={!canSwitch || loading}
        onClick={() => canSwitch && setOpen((v) => !v)}
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
            {loading ? 'Loading…' : (workspace?.label || 'Select workspace')}
          </span>
        </span>
        {canSwitch && (
          <ChevronDown size={14} className="ws-switcher__chevron" aria-hidden="true" />
        )}
      </button>

      {open && canSwitch && (
        <div className="ws-switcher__menu" role="listbox" aria-label="Workspaces">
          {workspaces.map((w) => {
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
          })}
        </div>
      )}
    </div>
  );
}
