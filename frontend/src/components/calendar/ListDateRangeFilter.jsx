import PropTypes from 'prop-types';
import { CalendarRange } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Publish list date range (server-side date_from / date_to).
 */
export default function ListDateRangeFilter({ dateFrom, dateTo, onChange }) {
  function patch(field, raw) {
    const next = { from: dateFrom, to: dateTo };
    next[field === 'from' ? 'from' : 'to'] = raw;
    if (next.from && next.to) {
      try {
        const a = parseISO(next.from);
        const b = parseISO(next.to);
        if (isValid(a) && isValid(b) && a > b) {
          if (field === 'from') next.to = next.from;
          else next.from = next.to;
        }
      } catch {
        /* ignore */
      }
    }
    onChange?.(next);
  }

  return (
    <div className="bb-cal__filter bb-cal-list-range">
      {/* <CalendarRange className="bb-cal__filter-icon" aria-hidden /> */}
      <label className="bb-cal-list-range__field">
        <span className="bb-cal-list-range__label">From</span>
        <input
          type="date"
          className="bb-cal-list-range__input"
          value={dateFrom || ''}
          max={dateTo || undefined}
          onChange={(e) => patch('from', e.target.value)}
          aria-label="Date from"
        />
      </label>
      <label className="bb-cal-list-range__field">
        <span className="bb-cal-list-range__label">To</span>
        <input
          type="date"
          className="bb-cal-list-range__input"
          value={dateTo || ''}
          min={dateFrom || undefined}
          onChange={(e) => patch('to', e.target.value)}
          aria-label="Date to"
        />
      </label>
    </div>
  );
}

ListDateRangeFilter.propTypes = {
  dateFrom: PropTypes.string,
  dateTo: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export function formatListRangeLabel(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return 'Date range';
  try {
    const a = parseISO(dateFrom);
    const b = parseISO(dateTo);
    if (!isValid(a) || !isValid(b)) return 'Date range';
    return `${format(a, 'MMM d, yyyy')} – ${format(b, 'MMM d, yyyy')}`;
  } catch {
    return 'Date range';
  }
}
