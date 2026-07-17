import { useState } from 'react';
import PropTypes from 'prop-types';
import CalendarDateCell from './CalendarDateCell';
import NoteTooltip from './NoteTooltip';
import { buildMonthCells, dayMeta } from './utils';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * BrightBean-style month grid. Always renders the full month (empty cells included).
 */
export default function CalendarMonthView({
  month,
  year,
  postsByDate = {},
  notesByDate = {},
  cardActions,
  onCreateAt,
  onDropPost,
}) {
  const [dropDate, setDropDate] = useState(null);
  const [hoveredNote, setHoveredNote] = useState(null);
  const [notePos, setNotePos] = useState({ x: 0, y: 0 });
  const { firstDay, cells } = buildMonthCells(month, year);

  return (
    <div className="bb-cal__body bb-cal-month-view">
      <div className="bb-cal__weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bb-cal__weekday">{d}</div>
        ))}
      </div>
      <div className="bb-cal__month">
        {cells.map((day) => {
          const meta = dayMeta(day, firstDay);
          return (
            <CalendarDateCell
              key={`${meta.dateStr}-${day.getMonth()}`}
              day={day}
              meta={meta}
              posts={postsByDate[meta.dateStr] || []}
              notes={notesByDate?.[meta.dateStr] || []}
              isDropTarget={dropDate === meta.dateStr}
              cardActions={cardActions}
              onCreateAt={onCreateAt}
              onDropPost={(id, dateStr, time, source) => {
                setDropDate(null);
                onDropPost?.(id, dateStr, time, source);
              }}
              onNoteHover={(e, note) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setNotePos({ x: rect.right + 4, y: rect.top });
                setHoveredNote(note);
              }}
              onNoteLeave={() => setHoveredNote(null)}
            />
          );
        })}
      </div>
      {hoveredNote ? (
        <div
          className="bb-cal__note-portal"
          ref={(el) => {
            if (el) {
              el.style.setProperty('--bb-cal-note-x', `${notePos.x}px`);
              el.style.setProperty('--bb-cal-note-y', `${notePos.y}px`);
            }
          }}
        >
          <NoteTooltip note={hoveredNote} />
        </div>
      ) : null}
    </div>
  );
}

CalendarMonthView.propTypes = {
  month: PropTypes.number.isRequired,
  year: PropTypes.number.isRequired,
  postsByDate: PropTypes.object,
  notesByDate: PropTypes.object,
  cardActions: PropTypes.object,
  onCreateAt: PropTypes.func,
  onDropPost: PropTypes.func,
};
