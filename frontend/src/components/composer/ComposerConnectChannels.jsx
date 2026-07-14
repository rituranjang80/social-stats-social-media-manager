/* ============================================================================
 * Connect Channels — workspace channel status with brand icons + check/unchecked.
 * Driven by env-configured catalog from /oauth/status (SS parity).
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Link2, Loader2, RefreshCw } from 'lucide-react';
import { oauthAPI } from '../../services/api';
import { isPlatformConnected } from '../../constants/socialPlatforms';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { TPlatformCheck } from '../t';

function normalizeStatusPayload(data) {
  if (!data) return { status: {}, catalog: [] };
  if (data.catalog || data.platforms) {
    return {
      status: data.platforms || {},
      catalog: Array.isArray(data.catalog) ? data.catalog : [],
    };
  }
  return { status: data, catalog: [] };
}

export default function ComposerConnectChannels({
  clientId,
  settingsPath,
  selectedPlatforms = [],
  onTogglePlatform,
  compact = false,
}) {
  const [status, setStatus] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (!clientId) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError('');
      }
      try {
        const res = await oauthAPI.status(clientId);
        if (!cancelled) {
          const n = normalizeStatusPayload(res.data);
          setStatus(n.status);
          setCatalog(n.catalog);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || 'Could not load channels');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStatus();
    return () => { cancelled = true; };
  }, [clientId]);

  async function load() {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await oauthAPI.status(clientId);
      const n = normalizeStatusPayload(res.data);
      setStatus(n.status);
      setCatalog(n.catalog);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load channels');
    } finally {
      setLoading(false);
    }
  }

  const rows = catalog.length
    ? catalog
    : Object.keys(status).map((id) => ({
      id,
      label: id,
      icon: id,
      status: status[id]?.status,
      connectable: !!(status[id]?.connectable || status[id]?.oauth_enabled),
      is_configured: !!(status[id]?.is_configured || status[id]?.connectable),
      credential_key: status[id]?.credential_key || id,
      account_name: status[id]?.account_name,
    }));

  const connectedCount = rows.filter(
    (p) => isPlatformConnected({ status: p.status }),
  ).length;

  return (
    <section
      className={`composer-connect ${compact ? 'composer-connect--compact' : ''}`}
      aria-label="Connect channels"
    >
      <div className="composer-connect__head">
        <div>
          <h2 className="composer-connect__title">Connect channels</h2>
          <p className="composer-connect__sub">
            {connectedCount
              ? `${connectedCount} checked · driven by SocialMediaStart .env`
              : 'Configure PLATFORM_* keys in SocialMediaStart/.env'}
          </p>
        </div>
        <button
          type="button"
          className="composer-connect__refresh"
          onClick={load}
          aria-label="Refresh channel status"
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="composer__spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {error && <p className="composer-connect__error" role="alert">{error}</p>}

      <ul className="composer-connect__list">
        {rows.map((p) => {
          const connected = isPlatformConnected({ status: p.status });
          const expired = p.status === 'expired';
          const toggleKey = p.credential_key || p.id;
          const selected = selectedPlatforms.includes(toggleKey) || selectedPlatforms.includes(p.id);
          const account = p.account_name || '';
          const canToggle = connected && p.connectable && onTogglePlatform;

          return (
            <li key={p.id} className={`composer-connect__item composer-connect__item--${p.id}`}>
              <button
                type="button"
                className={`composer-connect__row ${selected ? 'is-selected' : ''} ${connected ? 'is-connected' : ''}`}
                onClick={() => { if (canToggle) onTogglePlatform(toggleKey); }}
                disabled={!canToggle}
                aria-pressed={selected}
                title={
                  connected
                    ? `Toggle ${p.label} for this post`
                    : (p.connectable
                      ? `Connect ${p.label} in settings`
                      : `${p.label} — Not Configured in .env`)
                }
              >
                <span className="composer-connect__icon-wrap" aria-hidden="true">
                  <SocialPlatformIcon platform={p.icon || p.id} size={22} />
                  <TPlatformCheck
                    checked={connected}
                    expired={expired}
                    className="composer-connect__check"
                    size={14}
                  />
                </span>
                <span className="composer-connect__meta">
                  <span className="composer-connect__name">{p.label}</span>
                  <span className="composer-connect__account">
                    {connected
                      ? (account || (expired ? 'Expired' : 'Connected'))
                      : (p.connectable ? 'Ready to connect' : 'Not Configured')}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Link to={settingsPath} className="composer-connect__cta">
        <Plus size={14} aria-hidden="true" />
        Manage connections
        <Link2 size={12} aria-hidden="true" />
      </Link>
    </section>
  );
}
