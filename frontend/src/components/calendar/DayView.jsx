import { useState } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import CalendarCard from './CalendarCard';
import EmptyCalendar from './EmptyCalendar';
import { dayMeta, flattenPosts } from './utils';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function DayView({
  currentDate,
  postsByDate,
  cardActions,
  onCreateAt,
  onDropPost,
  onEmptyCreate,
}) {
  const [dropKey, setDropKey] = useState(null);
  const meta = dayMeta(currentDate);
  const dayPosts = postsByDate[meta.dateStr] || [];
  const hasAny = dayPosts.length > 0 || flattenPosts(postsByDate).length > 0;

  if (!hasAny) {
    return <EmptyCalendar onCreate={onEmptyCreate} />;
  }

  return (
    <div className="bb-cal__body">
      <div className="bb-cal__day-view">
        <div className="bb-cal__time-col bb-cal__weekday-spacer" />
        <div className="bb-cal__weekday">{format(currentDate, 'EEEE, MMM d')}</div>
        {HOURS.map((hour) => {
          const timeStr = `${String(hour).padStart(2, '0')}:00`;
          const key = `${meta.dateStr}|${timeStr}`;
          const posts = dayPosts.filter((p) => {
            const src = p.scheduled_at || p.published_at;
            if (!src) return hour === 9;
            try {
              return parseISO(src).getHours() === hour;
            } catch {
              return false;
            }
          });
          return (
            <div key={key} className="bb-cal__day-row">
              <div className="bb-cal__time-slot">{timeStr}</div>
              <div
                className={`bb-cal__slot${dropKey === key ? ' is-drop-target' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropKey(key);
                }}
                onDragLeave={() => setDropKey((cur) => (cur === key ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropKey(null);
                  const id = e.dataTransfer.getData('text/post-id');
                  const source = e.dataTransfer.getData('text/post-source') || 'calendar';
                  if (id) onDropPost?.(id, meta.dateStr, timeStr, source);
                }}
                onDoubleClick={() => {
                  if (!meta.past) onCreateAt?.(meta.dateStr, timeStr);
                }}
              >
                {posts.map((post) => (
                  <CalendarCard key={post.calendarKey || post.id} post={post} {...cardActions} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

DayView.propTypes = {
  currentDate: PropTypes.instanceOf(Date).isRequired,
  postsByDate: PropTypes.object,
  cardActions: PropTypes.object,
  onCreateAt: PropTypes.func,
  onDropPost: PropTypes.func,
  onEmptyCreate: PropTypes.func,
};
