import { useState } from 'react';
import PropTypes from 'prop-types';
import CalendarCard from './CalendarCard';
import HoverCreateButton from './HoverCreateButton';
import { DEFAULT_COMPOSE_TIME } from './constants';

/**
 * Single month-grid date cell with hover create + drag/drop.
 */
export default function CalendarDateCell({
  day,
  meta,
  posts = [],
  notes = [],
  isDropTarget = false,
  cardActions,
  onCreateAt,
  onDropPost,
  onNoteHover,
  onNoteLeave,
  maxVisible = 3,
}) {
  const [draggingOver, setDraggingOver] = useState(false);
  const visible = posts.slice(0, maxVisible);
  const extra = posts.length > maxVisible ? posts.length - maxVisible : 0;
  const classes = [
    'bb-cal__day',
    'bb-cal-date-cell',
    meta.past ? 'is-past' : '',
    meta.today ? 'is-today' : '',
    !meta.inMonth ? 'is-other' : '',
    posts.length ? 'has-posts' : '',
    meta.canSchedule ? 'can-create' : '',
    (isDropTarget || draggingOver) ? 'is-drop-target' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-date={meta.dateStr}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggingOver(true);
      }}
      onDragLeave={() => setDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDraggingOver(false);
        const id = e.dataTransfer.getData('text/post-id');
        const source = e.dataTransfer.getData('text/post-source') || 'calendar';
        if (id) onDropPost?.(id, meta.dateStr, DEFAULT_COMPOSE_TIME, source);
      }}
    >
      <div className="bb-cal__day-head">
        <span className="bb-cal__day-num">{day.getDate()}</span>
        <div className="bb-cal-date-cell__notes">
          {notes.slice(0, 3).map((note) => (
            <span
              key={note.id}
              className="bb-cal__card-dot"
              title={note.title}
              onMouseEnter={(e) => onNoteHover?.(e, note)}
              onMouseLeave={() => onNoteLeave?.()}
            />
          ))}
        </div>
        <HoverCreateButton
          dateStr={meta.dateStr}
          disabled={!meta.canSchedule}
          onClick={(date) => onCreateAt?.(date, DEFAULT_COMPOSE_TIME)}
        />
      </div>

      <div className="bb-cal-date-cell__posts">
        {visible.map((post) => (
          <CalendarCard key={post.calendarKey || post.id} post={post} {...cardActions} />
        ))}
        {extra > 0 ? (
          <button
            type="button"
            className="bb-cal__more"
            onClick={() => cardActions?.onOpen?.(posts[maxVisible])}
          >
            +{extra} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

CalendarDateCell.propTypes = {
  day: PropTypes.instanceOf(Date).isRequired,
  meta: PropTypes.object.isRequired,
  posts: PropTypes.array,
  notes: PropTypes.array,
  isDropTarget: PropTypes.bool,
  cardActions: PropTypes.object,
  onCreateAt: PropTypes.func,
  onDropPost: PropTypes.func,
  onNoteHover: PropTypes.func,
  onNoteLeave: PropTypes.func,
  maxVisible: PropTypes.number,
};
