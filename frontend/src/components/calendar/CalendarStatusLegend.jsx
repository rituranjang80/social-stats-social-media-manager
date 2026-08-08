import PropTypes from 'prop-types';
import { getActiveStatusFilters } from './statusTheme';
import {
  isShowingAllStatuses,
  isStatusChecked,
  selectAllStatuses,
  selectNoStatuses,
  toggleStatusCheck,
} from './statusFilterState';
import {
  isMasterIndeterminate,
  multiSelectMasterProps,
  multiSelectRowProps,
} from './multiSelectFilterState';
import MultiSelectCheckbox from './MultiSelectCheckbox';

/**
 * Sticky status legend with checkboxes — toggles which statuses appear on the calendar.
 */
export default function CalendarStatusLegend({ selected = [], onChange }) {
  const statusFilters = getActiveStatusFilters();
  const allIds = statusFilters.map((f) => f.id);
  const allOn = isShowingAllStatuses(selected);
  const indeterminate = isMasterIndeterminate(selected, allIds);
  const masterProps = multiSelectMasterProps(
    allOn,
    () => onChange?.(selectAllStatuses()),
    () => onChange?.(selectNoStatuses()),
  );

  return (
    <div className="bb-cal__legend" aria-label="Post status filters">
      <div className="bb-cal__legend-scroll">
        <label className="bb-cal__legend-item bb-cal__legend-item--all" {...masterProps}>
          <MultiSelectCheckbox
            checked={allOn}
            indeterminate={indeterminate}
            ariaLabel="Show all statuses"
          />
          <span className="bb-cal__legend-text">All Posts</span>
        </label>
        {statusFilters.map((f) => (
          <label
            key={f.id}
            className={[
              'bb-cal__legend-item',
              `bb-cal__legend-item--${f.id}`,
            ].join(' ')}
            {...multiSelectRowProps(() => onChange?.(toggleStatusCheck(f.id, selected)))}
          >
            <MultiSelectCheckbox
              checked={isStatusChecked(f.id, selected)}
              ariaLabel={`Show ${f.label} on calendar`}
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
