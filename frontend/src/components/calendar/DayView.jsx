import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import CalendarTimeSlot from './CalendarTimeSlot';
import { buildVisibleHours, dayMeta } from './utils';

export default function DayView({
  currentDate,
  postsByDate,
  cardActions,
  onCreateAt,
  onDropPost,
}) {
  const [dropKey, setDropKey] = useState(null);
  const meta = dayMeta(currentDate);
  const dayPosts = postsByDate[meta.dateStr] || [];
  const hours = useMemo(
    () => buildVisibleHours(postsByDate, [currentDate]),
    [postsByDate, currentDate],
  );

  return (
    <div className="bb-cal__body bb-cal-day-view-wrap">
      <div className="bb-cal__day-view">
        <div className="bb-cal__day-view-head">
          <div className="bb-cal__time-col bb-cal__weekday-spacer" />
          <div className="bb-cal__weekday">{format(currentDate, 'EEEE, MMM d')}</div>
        </div>
        {hours.map((hour) => {
          const timeStr = `${String(hour).padStart(2, '0')}:00`;
          const key = `${meta.dateStr}|${timeStr}`;
          return (
            <div key={key} className="bb-cal__day-row">
              <div className="bb-cal__time-slot">{timeStr}</div>
              <CalendarTimeSlot
                dateStr={meta.dateStr}
                timeStr={timeStr}
                hour={hour}
                dayPosts={dayPosts}
                canSchedule={meta.canSchedule}
                isDropTarget={dropKey === key}
                cardActions={cardActions}
                onCreateAt={onCreateAt}
                variant="day"
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
              />
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
