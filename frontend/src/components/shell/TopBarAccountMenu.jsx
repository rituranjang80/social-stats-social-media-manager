/* Account menu — mirrors sidebar Account section (settings + sign out). */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import UserAvatar, { getUserDisplayName } from '../ui/UserAvatar';

export default function TopBarAccountMenu({ basePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const accountSettingsPath = `${basePath}/account-settings`;
  const displayName = getUserDisplayName(user);

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

  function signOut() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <div
      ref={rootRef}
      className={`ds-topbar-account${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="ds-topbar-account__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar user={user} className="ds-topbar-account__avatar" />
        <ChevronDown size={14} className="ds-topbar-account__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="ds-topbar-account__menu" role="menu" aria-label="Account">
          <div className="ds-topbar-account__meta">
            <UserAvatar
              user={user}
              className="ds-topbar-account__meta-avatar"
              title={displayName}
            />
            <div className="ds-topbar-account__meta-text">
              <span className="ds-topbar-account__name">{displayName}</span>
              {user?.email && user.email !== displayName ? (
                <span className="ds-topbar-account__email">{user.email}</span>
              ) : null}
            </div>
          </div>
          <Link
            to={accountSettingsPath}
            role="menuitem"
            className="ds-topbar-account__item"
            onClick={() => setOpen(false)}
          >
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
            Account information
          </Link>
          <hr className="ds-topbar-account__sep" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className="ds-topbar-account__item ds-topbar-account__item--danger"
            onClick={signOut}
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Compact avatar-only trigger for mobile top bar. */
export function TopBarAccountMenuCompact({ basePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const accountSettingsPath = `${basePath}/account-settings`;
  const displayName = getUserDisplayName(user);

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

  return (
    <div ref={rootRef} className={`ds-topbar-account ds-topbar-account--compact${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ds-topbar-account__trigger ds-topbar-account__trigger--avatar-only"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar user={user} className="ds-topbar-account__avatar" title={displayName} />
      </button>
      {open && (
        <div className="ds-topbar-account__menu ds-topbar-account__menu--align-end" role="menu">
          <div className="ds-topbar-account__meta">
            <UserAvatar
              user={user}
              className="ds-topbar-account__meta-avatar"
              title={displayName}
            />
            <div className="ds-topbar-account__meta-text">
              <span className="ds-topbar-account__name">{displayName}</span>
              {user?.email && user.email !== displayName ? (
                <span className="ds-topbar-account__email">{user.email}</span>
              ) : null}
            </div>
          </div>
          <Link
            to={accountSettingsPath}
            role="menuitem"
            className="ds-topbar-account__item"
            onClick={() => setOpen(false)}
          >
            <User size={16} aria-hidden="true" />
            Account information
          </Link>
          <hr className="ds-topbar-account__sep" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className="ds-topbar-account__item ds-topbar-account__item--danger"
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
