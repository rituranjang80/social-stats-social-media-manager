import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import CalendarCardActions from './CalendarCardActions';
import { calendarAnchorIso, postCalendarKey } from './utils';
import { postStatusFilterKey, statusLabelFor } from './statusTheme';

function safeTime(iso) {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return '';
  }
}

function PinnedPostActionsTooltip({ post, cardActions, onUnpin }) {
  const statusKey = postStatusFilterKey(post.status);
  const statusHuman = statusLabelFor(post.status);
  const label = post.title || post.caption || post.content || '(untitled)';
  const timeStr = safeTime(calendarAnchorIso(post));
  const platforms = Array.isArray(post.platforms) && post.platforms.length
    ? post.platforms
    : [post.platform].filter(Boolean);

  return (
    <div
      className={`bb-cal__pinned-tooltip bb-cal__card--${statusKey}`}
      aria-label={`Actions for ${label}`}
    >
      <div className="bb-cal__pinned-tooltip-head">
        <span className="bb-cal__pinned-tooltip-platforms" aria-hidden>
          {platforms.slice(0, 3).map((pl) => (
            <SocialPlatformIcon key={pl} platform={pl} size={14} />
          ))}
        </span>
        <span className="bb-cal__pinned-tooltip-label">{label}</span>
        {timeStr ? (
          <span className="bb-cal__pinned-tooltip-time">{timeStr}</span>
        ) : null}
        <span className="bb-cal__pinned-tooltip-status">{statusHuman}</span>
        <button
          type="button"
          className="bb-cal__pinned-tooltip-close"
          onClick={() => onUnpin?.(post)}
          aria-label={`Close actions for ${label}`}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <CalendarCardActions
        post={post}
        visible
        className="bb-cal__card-actions--dock"
        {...cardActions}
      />
    </div>
  );
}

PinnedPostActionsTooltip.propTypes = {
  post: PropTypes.object.isRequired,
  cardActions: PropTypes.object,
  onUnpin: PropTypes.func,
};

/**
 * Viewport-fixed copy of the post action toolbar (bb-cal__card-actions).
 */
export default function CalendarPostDetailDock({ posts = [], cardActions = {}, onUnpin }) {
  if (!posts.length) return null;

  const node = (
    <div
      className="bb-cal bb-cal-post-dock-portal"
      data-calendar-post-dock
    >
      <div
        className="bb-cal__post-dock"
        role="region"
        aria-label="Pinned post actions"
        aria-live="polite"
      >
        <div className="bb-cal__post-dock-inner">
          {posts.map((post) => (
            <PinnedPostActionsTooltip
              key={postCalendarKey(post)}
              post={post}
              cardActions={cardActions}
              onUnpin={onUnpin}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node;
}

CalendarPostDetailDock.propTypes = {
  posts: PropTypes.array,
  cardActions: PropTypes.object,
  onUnpin: PropTypes.func,
};
