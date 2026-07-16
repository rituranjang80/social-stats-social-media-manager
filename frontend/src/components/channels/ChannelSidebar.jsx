/* ============================================================================
 * CHANNELS module — icon grid of connectable workspace channels.
 * Presentational only; parent owns OAuth status + toggle handlers.
 * ========================================================================== */
import { Link } from 'react-router-dom';
import { Loader2, Plus, Link2, RefreshCw } from 'lucide-react';
import TGrid from '../t/TGrid';
import TIconBadge from '../t/TIconBadge';

import '../../styles/scss/channel-sidebar.scss';

export default function ChannelSidebar({
  title = 'CHANNELS',
  subtitle,
  channels = [],
  cols = 4,
  gap = 10,
  loading = false,
  error = '',
  settingsPath,
  onRefresh,
  compact = false,
  className = '',
}) {
  const classes = [
    'channel-sidebar-module',
    'composer-connect',
    compact ? 'channel-sidebar-module--compact' : '',
    compact ? 'composer-connect--compact' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <section className={classes} aria-label={title}>
      <div className="channel-sidebar-module__head">
        <div>
          <h3 className="module-title">{title}</h3>
          {subtitle ? (
            <p className="channel-sidebar-module__sub">{subtitle}</p>
          ) : null}
        </div>
        {onRefresh ? (
          <button
            type="button"
            className="channel-sidebar-module__refresh"
            onClick={onRefresh}
            aria-label="Refresh channel status"
            disabled={loading}
          >
            {loading
              ? <Loader2 size={14} className="composer__spin" aria-hidden="true" />
              : <RefreshCw size={14} aria-hidden="true" />}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="channel-sidebar-module__error" role="alert">{error}</p>
      ) : null}

      <TGrid cols={cols} gap={gap}>
        {channels.map((channel) => (
          <TIconBadge
            key={channel.id}
            title={channel.title || channel.name}
            isConnected={!!channel.isConnected}
            isSelected={!!channel.isSelected}
            icon={
              channel.icon
                || (channel.svg
                  ? <span dangerouslySetInnerHTML={{ __html: channel.svg }} />
                  : null)
            }
            onClick={channel.onClick}
            disabled={!!channel.disabled}
          />
        ))}
      </TGrid>

      {settingsPath ? (
        <Link to={settingsPath} className="channel-sidebar-module__cta">
          <Plus size={14} aria-hidden="true" />
          Manage connections
          <Link2 size={12} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
