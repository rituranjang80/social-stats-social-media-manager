/* Reusable date range + connected channel filter + optional sync (Calendar / Analytics / Inbox). */
import PropTypes from 'prop-types';
import { Loader2, RefreshCw } from 'lucide-react';

import ConnectedChannelFilter from '../calendar/ConnectedChannelFilter';
import DateRangePicker from '../ui/DateRangePicker';

import '../../styles/scss/channel-selector.scss';

export default function WorkspaceChannelToolbar({
  clientId = null,
  workspaceLabel = '',
  currentUser = null,
  channels = [],
  onChannelsChange,
  fallbackPlatforms = [],
  range = null,
  onRangeChange = null,
  onSync = null,
  syncing = false,
  syncDisabled = false,
  syncTitle = 'Pull latest data from connected social APIs into the database',
  syncLabel = 'Sync',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`bb-cal__filters workspace-channel-toolbar ${className}`.trim()}
      style={{
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        ...style,
      }}
    >
      {range && onRangeChange && (
        <DateRangePicker range={range} onChange={onRangeChange} />
      )}
      <ConnectedChannelFilter
        clientId={clientId}
        workspaceLabel={workspaceLabel}
        currentUser={currentUser}
        selected={channels}
        onChange={onChannelsChange}
        fallbackPlatforms={fallbackPlatforms}
      />
      {onSync && (
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || syncDisabled || !clientId}
          title={syncTitle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1.5px solid var(--border-default)',
            background: 'var(--surface-card)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 700,
            cursor: clientId && !syncing ? 'pointer' : 'not-allowed',
            minHeight: 'unset',
            minWidth: 'unset',
          }}
        >
          {syncing
            ? <><Loader2 size={14} style={{ animation: 'wct-spin 1s linear infinite' }} /> Syncing…</>
            : <><RefreshCw size={14} /> {syncLabel}</>}
        </button>
      )}
      <style>{`@keyframes wct-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

WorkspaceChannelToolbar.propTypes = {
  clientId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  workspaceLabel: PropTypes.string,
  currentUser: PropTypes.object,
  channels: PropTypes.arrayOf(PropTypes.string),
  onChannelsChange: PropTypes.func,
  fallbackPlatforms: PropTypes.arrayOf(PropTypes.string),
  range: PropTypes.shape({ since: PropTypes.string, until: PropTypes.string }),
  onRangeChange: PropTypes.func,
  onSync: PropTypes.func,
  syncing: PropTypes.bool,
  syncDisabled: PropTypes.bool,
  syncTitle: PropTypes.string,
  syncLabel: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};
