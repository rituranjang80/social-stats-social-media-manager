import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Radio } from 'lucide-react';
import { useOAuthStatus } from '../../hooks/useData';
import { buildChannelCards } from '../channels/ChannelSelector';
import ChannelAvatar from '../channels/ChannelAvatar';
import SocialIcon from '../channels/SocialIcon';
import { getPlatformMeta } from '../../constants/socialPlatforms';

import '../../styles/scss/channel-selector.scss';

/**
 * Searchable multi-select of connected social accounts.
 * Empty selection = All Channels (no channel restriction).
 */
export default function ConnectedChannelFilter({
  clientId,
  workspaceLabel = '',
  currentUser = null,
  selected = [],
  onChange,
  fallbackPlatforms = [],
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const btnId = useId();
  const { status, catalog, loading } = useOAuthStatus(clientId);

  const oauthChannels = useMemo(
    () => buildChannelCards({
      status,
      catalog,
      workspaceLabel,
      currentUser,
    }),
    [status, catalog, workspaceLabel, currentUser],
  );

  const channels = useMemo(() => {
    const byId = new Map(oauthChannels.map((c) => [c.id, c]));
    (fallbackPlatforms || []).forEach((id) => {
      if (!id || byId.has(id)) return;
      const meta = getPlatformMeta(id) || {};
      byId.set(id, {
        id,
        platform: id,
        label: meta.label || id,
        name: meta.label || id,
        handle: meta.shortLabel ? `@${meta.shortLabel.toLowerCase()}` : '',
        avatarUrl: '',
        avatarName: meta.label || id,
        status: 'active',
        workspaceLabel: workspaceLabel || '',
      });
    });
    return Array.from(byId.values());
  }, [oauthChannels, fallbackPlatforms, workspaceLabel]);

  const grouped = useMemo(() => {
    const map = new Map();
    channels.forEach((ch) => {
      const key = ch.platform || ch.id;
      if (!map.has(key)) map.set(key, { platform: key, label: ch.label, items: [] });
      map.get(key).items.push(ch);
    });
    return Array.from(map.values());
  }, [channels]);

  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        items: g.items.filter((ch) => {
          const hay = [ch.name, ch.handle, ch.label, ch.platform].join(' ').toLowerCase();
          return hay.includes(needle);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [grouped, q]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggle(id) {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  }

  function selectAll() {
    onChange(channels.map((c) => c.id));
  }

  function clearAll() {
    onChange([]);
  }

  const allSelected = selected.length === 0;
  const label = allSelected
    ? 'All Channels'
    : `${selected.length} channel${selected.length > 1 ? 's' : ''}`;

  return (
    <div className="bb-cal__filter bb-cal-channel-filter" ref={ref}>
      <Radio className="bb-cal__filter-icon" aria-hidden />
      <button
        id={btnId}
        type="button"
        className="bb-cal__select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div className="bb-cal__multi bb-cal-channel-filter__panel" role="listbox" aria-labelledby={btnId}>
          <input
            className="bb-cal__multi-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search channels…"
            aria-label="Search channels"
          />
          <label className="bb-cal__multi-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => clearAll()}
            />
            All Channels
          </label>
          {loading && !channels.length ? (
            <p className="bb-cal__multi-item">Loading channels…</p>
          ) : null}
          {!loading && channels.length === 0 ? (
            <p className="bb-cal__multi-item">No connected channels</p>
          ) : null}
          {filteredGroups.map((group) => (
            <div key={group.platform} className="bb-cal-channel-filter__group">
              <div className="bb-cal-channel-filter__group-label">{group.label}</div>
              {group.items.map((ch) => (
                <label key={ch.id} className="bb-cal-channel-filter__row">
                  <input
                    type="checkbox"
                    checked={!allSelected && selected.includes(ch.id)}
                    onChange={() => toggle(ch.id)}
                  />
                  <ChannelAvatar src={ch.avatarUrl} name={ch.avatarName || ch.name} size="sm" />
                  <SocialIcon platform={ch.platform} size={14} />
                  <span className="bb-cal-channel-filter__meta">
                    <span className="bb-cal-channel-filter__name">{ch.name}</span>
                    {ch.handle ? (
                      <span className="bb-cal-channel-filter__handle">{ch.handle}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          ))}
          <div className="bb-cal__multi-actions">
            <button type="button" className="bb-cal__link-btn" onClick={selectAll} disabled={!channels.length}>
              Select all
            </button>
            <button type="button" className="bb-cal__link-btn" onClick={clearAll}>
              Clear all
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

ConnectedChannelFilter.propTypes = {
  clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  workspaceLabel: PropTypes.string,
  currentUser: PropTypes.object,
  selected: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  fallbackPlatforms: PropTypes.arrayOf(PropTypes.string),
};
