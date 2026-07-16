/* ============================================================================
 * Connect Channels — workspace channel status with brand icons + check/unchecked.
 * Driven by env-configured catalog from /oauth/status (SS parity).
 * UI: reusable ChannelSidebar + TGrid + TIconBadge (SCSS only).
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { oauthAPI } from '../../services/api';
import { isPlatformConnected } from '../../constants/socialPlatforms';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import ChannelSidebar from '../channels/ChannelSidebar';

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

  const rows = useMemo(() => {
    if (catalog.length) return catalog;
    return Object.keys(status).map((id) => ({
      id,
      label: id,
      icon: id,
      status: status[id]?.status,
      connectable: !!(status[id]?.connectable || status[id]?.oauth_enabled),
      is_configured: !!(status[id]?.is_configured || status[id]?.connectable),
      credential_key: status[id]?.credential_key || id,
      account_name: status[id]?.account_name,
    }));
  }, [catalog, status]);

  const connectedCount = rows.filter(
    (p) => isPlatformConnected({ status: p.status }),
  ).length;

  const channels = useMemo(() => rows.map((p) => {
    const connected = isPlatformConnected({ status: p.status });
    const expired = p.status === 'expired';
    const toggleKey = p.credential_key || p.id;
    const selected = selectedPlatforms.includes(toggleKey)
      || selectedPlatforms.includes(p.id);
    const account = p.account_name || '';
    const canToggle = connected && p.connectable && onTogglePlatform;

    let title;
    if (connected) {
      title = account
        ? `${p.label} · ${account}`
        : `Toggle ${p.label} for this post`;
      if (expired) title = `${p.label} — Expired`;
    } else if (p.connectable) {
      title = `Connect ${p.label} in settings`;
    } else {
      title = `${p.label} — Not Configured in .env`;
    }

    return {
      id: p.id,
      name: p.label,
      title,
      isConnected: connected,
      isSelected: selected,
      disabled: !canToggle,
      icon: <SocialPlatformIcon platform={p.icon || p.id} size={22} />,
      onClick: canToggle ? () => onTogglePlatform(toggleKey) : undefined,
    };
  }), [rows, selectedPlatforms, onTogglePlatform]);

  const subtitle = connectedCount
    ? `${connectedCount} connected · driven by SocialMediaStart .env`
    : 'Configure PLATFORM_* keys in SocialMediaStart/.env';

  return (
    <ChannelSidebar
      compact={compact}
      title="CHANNELS"
      subtitle={subtitle}
      channels={channels}
      cols={4}
      gap={10}
      loading={loading}
      error={error}
      settingsPath={settingsPath}
      onRefresh={load}
    />
  );
}
