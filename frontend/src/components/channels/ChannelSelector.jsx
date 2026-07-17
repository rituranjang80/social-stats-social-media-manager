/* ============================================================================
 * ChannelSelector — loads workspace OAuth status and renders channel cards.
 * Selection still drives composer `targetPlatforms` (platform ids).
 * ========================================================================== */
import { useMemo } from 'react';
import { useOAuthStatus } from '../../hooks/useData';
import {
  OAUTH_PLATFORM_IDS,
  getPlatformMeta,
  isPlatformConnected,
} from '../../constants/socialPlatforms';
import ChannelGrid from './ChannelGrid';

import '../../styles/scss/channel-selector.scss';

function slugHandle(name, platform) {
  const base = String(name || platform || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return base ? `@${base}` : '';
}

/**
 * Build selectable channel cards from live OAuth status + catalog.
 * Falls back to static OAuth platform ids when status is empty.
 */
export function buildChannelCards({
  status = {},
  catalog = [],
  workspaceLabel = '',
  platformIds = OAUTH_PLATFORM_IDS,
  currentUser = null,
}) {
  const fromCatalog = Array.isArray(catalog) && catalog.length
    ? catalog.map((c) => c.id || c.credential_key).filter(Boolean)
    : platformIds;

  // Prefer connected first, keep stable order from catalog/platformIds
  const ids = [...fromCatalog];
  platformIds.forEach((id) => {
    if (!ids.includes(id)) ids.push(id);
  });

  const userName = [
    currentUser?.first_name,
    currentUser?.last_name,
  ].filter(Boolean).join(' ') || currentUser?.username || currentUser?.email || '';
  const userAvatarUrl = currentUser?.profile_image
    || currentUser?.profile_image_url
    || currentUser?.avatar_url
    || '';

  const catalogById = new Map(
    (Array.isArray(catalog) ? catalog : [])
      .map((c) => [c.id || c.credential_key, c])
      .filter(([key]) => key),
  );

  return ids.map((id) => {
    const meta = getPlatformMeta(id) || {};
    const cat = catalogById.get(id) || {};
    const credKey = cat.credential_key || id;
    const st = status[id] || status[credKey] || {};
    const rawStatus = st.status || cat.status || '';
    const connected = isPlatformConnected({ status: rawStatus });
    if (!connected) return null;
    const accountName = st.account_name || cat.account_name || '';
    const name = accountName || userName || meta.label || id;
    const connStatus = rawStatus || (connected ? 'active' : 'not_connected');

    return {
      id,
      platform: id,
      label: meta.label || cat.label || id,
      name,
      handle: accountName ? slugHandle(accountName, id) : (meta.shortLabel ? `@${meta.shortLabel.toLowerCase()}` : ''),
      avatarUrl: st.avatar_url || st.profile_image_url || st.picture || cat.avatar_url || userAvatarUrl,
      avatarName: userName || name,
      status: connStatus,
      workspaceLabel: workspaceLabel || '',
      title: [
        name,
        meta.label || cat.label,
        connStatus === 'active' ? 'Connected' : connStatus === 'expired' ? 'Expired' : 'Not connected',
        workspaceLabel,
      ].filter(Boolean).join(' · '),
    };
  }).filter(Boolean);
}

export default function ChannelSelector({
  clientId,
  workspaceLabel = '',
  selected = [],
  onToggle,
  platformIds = OAUTH_PLATFORM_IDS,
  currentUser = null,
  className = '',
}) {
  const { status, catalog, loading } = useOAuthStatus(clientId);

  const channels = useMemo(
    () => buildChannelCards({
      status,
      catalog,
      workspaceLabel,
      platformIds,
      currentUser,
    }),
    [status, catalog, workspaceLabel, platformIds, currentUser],
  );

  return (
    <div className={['channel-selector', className].filter(Boolean).join(' ')}>
      <ChannelGrid
        channels={channels}
        selectedIds={selected}
        onToggle={onToggle}
        loading={loading && !channels.length}
        emptyMessage="No connected channels for this workspace. Connect an account first."
      />
    </div>
  );
}
