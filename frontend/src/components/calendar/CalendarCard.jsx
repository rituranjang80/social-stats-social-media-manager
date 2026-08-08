import PropTypes from 'prop-types';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { format, parseISO } from 'date-fns';
import { postStatusFilterKey, statusLabelFor } from './statusTheme';
import { calendarAnchorIso } from './utils';
import { useCalendarUi } from './CalendarUiContext';
import CalendarCardActions from './CalendarCardActions';

function safeTime(iso) {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return '';
  }
}

function thumbUrl(post) {
  if (post.thumbnail_url) return post.thumbnail_url;
  if (post.image_url) return post.image_url;
  if (Array.isArray(post.media_urls) && post.media_urls.length) {
    const u = post.media_urls[0];
    if (typeof u === 'string' && !/\.(mp4|mov|webm)(\?|$)/i.test(u)) return u;
  }
  return '';
}

function tagList(post) {
  if (Array.isArray(post.tags) && post.tags.length) {
    return post.tags.map((t) => String(t).replace(/^#/, '')).filter(Boolean).slice(0, 3);
  }
  const raw = post.hashtags || '';
  return String(raw)
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Brightbean-style calendar post chip with hover actions + drag handle.
 */
export default function CalendarCard({
  post,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onAnalytics,
  onComposer,
  draggable = true,
  onDragStart,
  onDragEnd,
  compact = false,
  showPinCheckbox = true,
}) {
  const ui = useCalendarUi();
  const pinEnabled = showPinCheckbox && ui;
  const pinned = pinEnabled && ui.isPostPinned(post);
  const statusKey = postStatusFilterKey(post.status);
  const statusHuman = statusLabelFor(post.status);
  const label = post.title || post.caption || post.content || '(untitled)';
  const timeSrc = calendarAnchorIso(post);
  const timeStr = safeTime(timeSrc);
  const platforms = Array.isArray(post.platforms) && post.platforms.length
    ? post.platforms
    : [post.platform].filter(Boolean);
  const thumb = thumbUrl(post);
  const tags = tagList(post);
  const account = post.account_name || post.page_name || '';
  const tooltip = [
    label,
    statusHuman,
    timeStr,
    platforms.length ? platforms.join(', ') : '',
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={[
        'bb-cal__card',
        compact ? 'bb-cal__card--compact' : 'bb-cal__card--rich',
        `bb-cal__card--${statusKey}`,
        pinned ? 'is-pinned' : '',
      ].join(' ')}
      title={pinned ? undefined : tooltip}
      draggable={draggable && statusKey !== 'published'}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/post-id', String(post.id));
        e.dataTransfer.setData('text/post-source', post.source || 'calendar');
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('is-dragging');
        onDragStart?.(post, e);
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove('is-dragging');
        onDragEnd?.(post, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(post);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(post);
        }
      }}
      aria-label={`${label}, ${statusHuman}${timeStr ? `, ${timeStr}` : ''}`}
    >
      {pinEnabled ? (
        <span
          className="bb-cal__card-pin"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="bb-cal__card-pin-input"
            checked={pinned}
            aria-label={`Show actions for ${label}`}
            onChange={(e) => {
              ui.setPostPinned(post, e.target.checked);
            }}
          />
        </span>
      ) : null}
      <span className="bb-cal__card-meta">
        <span className="bb-cal__card-label">{label}</span>
        {!compact && account ? <span className="bb-cal__card-account">{account}</span> : null}
      </span>

      {!compact && thumb ? (
        <img className="bb-cal__card-thumb" src={thumb} alt="" loading="lazy" />
      ) : null}
      {!compact && !thumb ? (
        <span className="bb-cal__card-dot" aria-hidden />
      ) : null}
      
            {timeStr ? <span className="bb-cal__card-time">{timeStr}</span> : null}
            <span className="bb-cal__card-platforms" aria-hidden>
        {platforms.slice(0, 2).map((pl) => (
          <SocialPlatformIcon key={pl} platform={pl} size={compact ? 14 : 12} />
        ))}
      </span>
      <span className="bb-cal__card-status sr-only">{statusHuman}</span>
      {!compact && tags.length ? (
        <span className="bb-cal__card-tags">
          {tags.map((t) => (
            <span key={t} className="bb-cal__card-tag">#{t}</span>
          ))}
        </span>
      ) : null}

      <CalendarCardActions
        post={post}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onPreview={onPreview}
        onAnalytics={onAnalytics}
        onComposer={onComposer}
      />
    </div>
  );
}

CalendarCard.propTypes = {
  post: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
  onPreview: PropTypes.func,
  onAnalytics: PropTypes.func,
  onComposer: PropTypes.func,
  draggable: PropTypes.bool,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  compact: PropTypes.bool,
  showPinCheckbox: PropTypes.bool,
};
