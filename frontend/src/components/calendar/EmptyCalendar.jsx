import PropTypes from 'prop-types';
import { CalendarPlus, Plus } from 'lucide-react';

export default function EmptyCalendar({ onCreate, title = 'Create your first post' }) {
  return (
    <div className="bb-cal__empty" role="status">
      <div className="bb-cal__empty-art" aria-hidden>
        <CalendarPlus size={32} />
      </div>
      <h3 className="bb-cal__empty-title">{title}</h3>
      <p className="bb-cal__empty-copy">
        Plan your content across channels. Schedule a post to see it on this calendar.
      </p>
      {onCreate ? (
        <button type="button" className="bb-cal__empty-cta" onClick={onCreate}>
          <Plus size={16} />
          New Post
        </button>
      ) : null}
    </div>
  );
}

EmptyCalendar.propTypes = {
  onCreate: PropTypes.func,
  title: PropTypes.string,
};
