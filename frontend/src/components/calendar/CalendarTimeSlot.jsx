import PropTypes from 'prop-types';
import CalendarCard from './CalendarCard';
import HoverCreateButton from './HoverCreateButton';
import { postsForHourSlot } from './utils';

/**
 * Week/day time cell — post chips, tooltips, and create control.
 */
export default function CalendarTimeSlot({
  dateStr,
  timeStr,
  hour,
  dayPosts = [],
  canSchedule = true,
  isDropTarget = false,
  cardActions,
  onCreateAt,
  onDragOver,
  onDragLeave,
  onDrop,
  variant = 'week',
}) {
  const slotPosts = postsForHourSlot(dayPosts, hour);
  const isDay = variant === 'day';
  const classes = [
    'bb-cal__slot',
    'bb-cal-time-slot',
    isDay ? 'bb-cal-time-slot--day' : '',
    canSchedule ? 'can-create' : '',
    !canSchedule ? 'is-past' : '',
    isDropTarget ? 'is-drop-target' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDoubleClick={() => {
        if (canSchedule) onCreateAt?.(dateStr, timeStr);
      }}
    >
      <div className="bb-cal-time-slot__posts">
        {canSchedule ? (
          <HoverCreateButton
            dateStr={dateStr}
            timeStr={timeStr}
            disabled={!canSchedule}
            onClick={(date, time) => onCreateAt?.(date, time || timeStr)}
            slotCorner={!isDay}
            dayHoverTop={isDay}
          />
        ) : null}
        {slotPosts.map((post) => (
          <CalendarCard
            key={post.calendarKey || post.id}
            post={post}
            compact
            {...cardActions}
          />
        ))}
      </div>
    </div>
  );
}

CalendarTimeSlot.propTypes = {
  dateStr: PropTypes.string.isRequired,
  timeStr: PropTypes.string.isRequired,
  hour: PropTypes.number.isRequired,
  dayPosts: PropTypes.array,
  canSchedule: PropTypes.bool,
  isDropTarget: PropTypes.bool,
  cardActions: PropTypes.object,
  onCreateAt: PropTypes.func,
  onDragOver: PropTypes.func,
  onDragLeave: PropTypes.func,
  onDrop: PropTypes.func,
  variant: PropTypes.oneOf(['week', 'day']),
};
