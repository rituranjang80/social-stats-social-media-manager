import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import CalendarCard from './CalendarCard';
import EmptyCalendar from './EmptyCalendar';
import { buildWeekDays, dayMeta, flattenPosts } from './utils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export default function WeekView({
  currentDate,
  postsByDate,
  cardActions,
  onCreateAt,
  onDropPost,
  onEmptyCreate,
}) {
  const [dropKey, setDropKey] = useState(null);
  const days = useMemo(() => buildWeekDays(currentDate), [currentDate]);
  const hasAny = flattenPosts(postsByDate).length > 0;

  if (!hasAny) return <EmptyCalendar onCreate={onEmptyCreate} />;

  return (
    <div className="bb-cal__body">
      <div className="bb-cal__week-header">
        <div className="bb-cal__time-col" />
        {days.map((day) => {
          const meta = dayMeta(day);
          return (
            <div key={meta.dateStr} className="bb-cal__weekday">
              {format(day, 'EEE d')}
            </div>
          );
        })}
      </div>
      {HOURS.map((hour) => {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        return (
          <div key={`row-${hour}`} className="bb-cal__week-row">
            <div className="bb-cal__time-slot">{timeStr}</div>
            {days.map((day) => {
              const meta = dayMeta(day);
              const key = `${meta.dateStr}|${timeStr}`;
              const posts = (postsByDate[meta.dateStr] || []).filter((p) => {
                const src = p.scheduled_at || p.published_at;
                if (!src) return hour === 9;
                try {
                  return parseISO(src).getHours() === hour;
                } catch {
                  return false;
                }
              });
              return (
                <div
                  key={key}
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

WeekView.propTypes = {
  currentDate: PropTypes.instanceOf(Date).isRequired,
  postsByDate: PropTypes.object,
  cardActions: PropTypes.object,
  onCreateAt: PropTypes.func,
  onDropPost: PropTypes.func,
  onEmptyCreate: PropTypes.func,
};
