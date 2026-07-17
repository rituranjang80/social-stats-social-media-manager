import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import EmptyCalendar from './EmptyCalendar';
import { buildWeekDays } from './utils';

export default function AgendaView({
  currentDate,
  postsByDate,
  onOpen,
  onEdit,
  onDelete,
  isAdmin,
  onEmptyCreate,
  scope = 'week',
}) {
  const days = scope === 'all'
    ? Object.keys(postsByDate || {}).sort()
    : buildWeekDays(currentDate).map((d) => format(d, 'yyyy-MM-dd'));

  const entries = days
    .map((dateStr) => [dateStr, postsByDate[dateStr] || []])
    .filter(([, posts]) => posts.length > 0);

  if (entries.length === 0) {
    return <EmptyCalendar onCreate={onEmptyCreate} />;
  }

  return (
    <div className="bb-cal__body">
      {entries.map(([dateStr, posts]) => (
        <div key={dateStr} className="bb-cal__agenda-group">
          <div className="bb-cal__agenda-date">
            {format(parseISO(dateStr), 'EEEE, MMMM d')}
            {' · '}
            {posts.length}
          </div>
          {posts.map((post) => {
            const timeSrc = post.scheduled_at || post.published_at;
            const timeStr = timeSrc ? format(parseISO(timeSrc), 'h:mm a') : '';
            return (
              <div key={post.calendarKey || post.id} className="bb-cal__agenda-row">
                <SocialPlatformIcon platform={post.platform} size={20} />
                <div className="bb-cal__agenda-main">
                  <strong>{post.title || '(no title)'}</strong>
                  <p className="bb-cal__agenda-caption">{(post.caption || '').slice(0, 140)}</p>
                  <span className={`bb-cal__card bb-cal__card--${post.status}`}>{post.status}</span>
                </div>
                <div className="bb-cal__agenda-side">
                  <div>{timeStr}</div>
                  <button type="button" className="bb-cal__link-btn" onClick={() => onOpen?.(post)}>View</button>
                  {isAdmin && post.status !== 'published' ? (
                    <>
                      <button type="button" className="bb-cal__link-btn" onClick={() => onEdit?.(post)}>Edit</button>
                      <button type="button" className="bb-cal__link-btn" onClick={() => onDelete?.(post)}>Delete</button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

AgendaView.propTypes = {
  currentDate: PropTypes.instanceOf(Date).isRequired,
  postsByDate: PropTypes.object,
  onOpen: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isAdmin: PropTypes.bool,
  onEmptyCreate: PropTypes.func,
  scope: PropTypes.string,
};
