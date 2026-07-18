/* ============================================================================
 * ChannelGrid — responsive / swipeable row of channel cards.
 * ========================================================================== */
import ChannelCard from './ChannelCard';

export default function ChannelGrid({
  channels = [],
  selectedIds = [],
  onToggle,
  loading = false,
  emptyMessage = 'No channels available for this workspace.',
  emptyAction,
}) {
  const selected = new Set((selectedIds || []).map(String));

  if (loading) {
    return (
      <div className="channel-grid channel-grid--loading" role="status" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="channel-card channel-card--skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="channel-grid__empty" role="status">
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div
      className="channel-grid"
      role="listbox"
      aria-label="Connected social channels"
      aria-multiselectable="true"
    >
      {channels.map((ch) => (
        <div key={ch.id} className="channel-grid__item" role="none">
          <ChannelCard
            channel={ch}
            selected={selected.has(String(ch.id))}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  );
}
