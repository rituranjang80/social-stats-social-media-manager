import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { postStatusFilterKey, statusLabelFor } from '../calendar/statusTheme';
import { calendarAnchorIso } from '../calendar/utils';

function safeTime(iso) {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return '';
  }
}

function captionPreview(post) {
  const raw = post.title || post.caption || post.content || '';
  const t = String(raw).trim();
  if (!t) return '(No caption)';
  return t.length > 160 ? `${t.slice(0, 160)}…` : t;
}

export default function PostManagementCard({
  post,
  statusOptions,
  canChangeStatus,
  onStatusChange,
  statusSaving,
  basePath,
  clientId,
}) {
  const statusKey = postStatusFilterKey(post.status);
  const statusHuman = statusLabelFor(post.status);
  const when = safeTime(calendarAnchorIso(post));
  const platforms = Array.isArray(post.platforms) && post.platforms.length
    ? post.platforms
    : [post.platform].filter(Boolean);
  const composerLink = post.source === 'composer' && post.id
    ? `${basePath}/analytics/composer/${post.id}?client_id=${encodeURIComponent(clientId || '')}`
    : null;
  const filterKey = postStatusFilterKey(post.status);
  const canOpen = !!composerLink;

  const handleStatusSelect = (e) => {
    e.stopPropagation();
    const nextKey = e.target.value;
    const opt = (statusOptions || []).find((o) => o.value === nextKey);
    const raw = opt?.rawStatus || nextKey;
    onStatusChange?.(post, raw);
  };

  const onTileActivate = () => {
    if (composerLink) {
      window.open(composerLink, '_blank', 'noopener,noreferrer');
    }
  };

  const onKeyDown = (e) => {
    if (!canOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTileActivate();
    }
  };

  return (
    <article
      className={`bb-pm-card bb-cal__card bb-cal__card--compact bb-cal__card--${statusKey}${canOpen ? ' bb-pm-card--clickable' : ''}`}
      onClick={canOpen ? onTileActivate : undefined}
      onKeyDown={onKeyDown}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      title={canOpen ? 'Open in Composer (new tab)' : undefined}
    >
      <div className="bb-pm-card__main">
        <SocialPlatformIcon platform={platforms[0] || 'facebook'} size={18} />
        <div className="bb-pm-card__text">
          <p className="bb-pm-card__caption">{captionPreview(post)}</p>
          <div className="bb-pm-card__meta">
            <span className={`bb-cal__status-chip bb-cal__card--${statusKey}`}>
              {statusHuman}
            </span>
            <span className="bb-pm-card__when">{when}</span>
          </div>
        </div>
      </div>

      {canChangeStatus ? (
        <label
          className="bb-pm-card__status-select"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <select
            value={filterKey}
            disabled={statusSaving}
            onChange={handleStatusSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label="Change post status"
          >
            {(statusOptions || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusSaving ? <Loader2 size={14} className="bb-cal__spin" /> : null}
        </label>
      ) : null}
    </article>
  );
}

PostManagementCard.propTypes = {
  post: PropTypes.object.isRequired,
  statusOptions: PropTypes.arrayOf(PropTypes.object),
  canChangeStatus: PropTypes.bool,
  onStatusChange: PropTypes.func,
  statusSaving: PropTypes.bool,
  basePath: PropTypes.string,
  clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
