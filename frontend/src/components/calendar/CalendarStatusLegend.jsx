import PropTypes from 'prop-types';
import { CAL_STATUS_FILTERS } from './statusTheme';
import {
  isShowingAllStatuses,
  isStatusChecked,
  selectAllStatuses,
  toggleStatusCheck,
} from './statusFilterState';
import { multiSelectMasterProps, multiSelectRowProps } from './multiSelectFilterState';

/**
 * Sticky status legend with checkboxes — toggles which statuses appear on the calendar.
 */
export default function CalendarStatusLegend({ selected = [], onChange }) {
  const allOn = isShowingAllStatuses(selected);
  const masterProps = multiSelectMasterProps(allOn, () => onChange?.(selectAllStatuses()));

  return (
    <div className="bb-cal__legend" aria-label="Post status filters">
      <div className="bb-cal__legend-scroll">
        <label className="bb-cal__legend-item bb-cal__legend-item--all" {...masterProps}>
          <input
            type="checkbox"
            readOnly
            tabIndex={-1}
            checked={allOn}
            aria-label="Show all statuses"
          />
          <span className="bb-cal__legend-text">All Posts</span>
        </label>
        {CAL_STATUS_FILTERS.map((f) => (
          <label
            key={f.id}
            className={[
              'bb-cal__legend-item',
              `bb-cal__legend-item--${f.id}`,
            ].join(' ')}
            {...multiSelectRowProps(() => onChange?.(toggleStatusCheck(f.id, selected)))}
          >
            <input
              type="checkbox"
              readOnly
              tabIndex={-1}
              checked={isStatusChecked(f.id, selected)}
              aria-label={`Show ${f.label} on calendar`}
            />
            <span className={`bb-cal__legend-swatch bb-cal__legend-swatch--${f.id}`} aria-hidden />
            <span className={`bb-cal__legend-text bb-cal__legend-text--${f.id}`}>
              {f.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

CalendarStatusLegend.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
};
