/* ============================================================================
 * ChannelCard — selectable connected-account card (Brightbean-style).
 * ========================================================================== */
import { Check } from 'lucide-react';
import ChannelAvatar from './ChannelAvatar';
import SocialIcon from './SocialIcon';
import StatusBadge from './StatusBadge';

export default function ChannelCard({
  channel,
  selected = false,
  onToggle,
  disabled = false,
}) {
  const {
    id,
    platform,
    name,
    handle,
    avatarUrl,
    avatarName,
    status,
    workspaceLabel,
    title,
  } = channel;

  const displayName = name || channel.label || platform;
  const tooltip = title || [displayName, handle, workspaceLabel].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      className={[
        'channel-card',
        selected ? 'is-selected' : '',
        disabled ? 'is-disabled' : '',
        status === 'expired' ? 'is-expired' : '',
        status === 'not_connected' ? 'is-disconnected' : '',
      ].filter(Boolean).join(' ')}
      role="option"
      aria-selected={selected}
      aria-label={`${displayName}${handle ? ` (${handle})` : ''} — ${selected ? 'selected' : 'not selected'}`}
      title={tooltip}
      disabled={disabled}
      onClick={() => onToggle?.(id)}
    >
      <span className="channel-card__check" aria-hidden="true">
        {selected ? <Check size={10} strokeWidth={3} /> : null}
      </span>
      {/* <span className="sr-only">{selected ? 'Selected' : 'Not selected'}</span> */}

      <span className="channel-card__avatar-wrap">
        <ChannelAvatar src={avatarUrl} name={avatarName || displayName} size="sm" />
        <span className={`channel-card__platform channel-card__platform--${platform}`}>
          <SocialIcon platform={platform} size={12} title={channel.label} />
        </span>
      </span>

      <span className="channel-card__meta">
        <span className="channel-card__name">{displayName}</span>
        {handle ? <span className="channel-card__handle">{handle}</span> : null}
        <span className="channel-card__footer">
          <StatusBadge status={status} />
          {workspaceLabel ? (
            <span className="channel-card__workspace">{workspaceLabel}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
