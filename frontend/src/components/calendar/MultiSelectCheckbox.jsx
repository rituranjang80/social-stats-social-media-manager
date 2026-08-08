import PropTypes from 'prop-types';
import { Check, Minus } from 'lucide-react';

/**
 * Calendar filter checkbox — custom box so unchecked state is always visible
 * (native readOnly checkboxes can fail to repaint when controlled from label clicks).
 */
export default function MultiSelectCheckbox({
  checked,
  indeterminate = false,
  ariaLabel,
}) {
  const on = !!checked && !indeterminate;
  const boxClass = [
    'bb-cal-multi-cb__box',
    indeterminate ? 'is-indeterminate' : '',
    on ? 'is-checked' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className="bb-cal-multi-cb">
      <input
        type="checkbox"
        className="bb-cal-multi-cb__input"
        readOnly
        tabIndex={-1}
        checked={on}
        aria-checked={indeterminate ? 'mixed' : on}
        aria-label={ariaLabel}
      />
      <span className={boxClass} aria-hidden>
        {indeterminate ? (
          <Minus size={10} strokeWidth={3} />
        ) : on ? (
          <Check size={10} strokeWidth={3} />
        ) : null}
      </span>
    </span>
  );
}

MultiSelectCheckbox.propTypes = {
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  ariaLabel: PropTypes.string,
};
