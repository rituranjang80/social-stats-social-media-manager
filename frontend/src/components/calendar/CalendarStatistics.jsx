import PropTypes from 'prop-types';

export default function CalendarStatistics({ counts }) {
  const items = [
    { key: 'total', label: 'Total' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Draft' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <div className="bb-cal__stats" aria-label="Calendar statistics">
      {items.map((item) => (
        <div key={item.key} className="bb-cal__stat">
          <strong>{counts?.[item.key] ?? 0}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

CalendarStatistics.propTypes = {
  counts: PropTypes.object,
};
