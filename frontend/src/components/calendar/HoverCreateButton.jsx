import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';

/**
 * Small floating "+" — visible only while parent cell is hovered (CSS).
 */
export default function HoverCreateButton({
  dateStr,
  onClick,
  disabled = false,
  label,
}) {
  if (disabled) return null;

  return (
    <button
      type="button"
      className="bb-cal-hover-create"
      aria-label={label || `Create post on ${dateStr}`}
      title={label || 'Create post'}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(dateStr, e);
      }}
    >
      <Plus size={14} strokeWidth={2.5} aria-hidden />
    </button>
  );
}

HoverCreateButton.propTypes = {
  dateStr: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  label: PropTypes.string,
};
