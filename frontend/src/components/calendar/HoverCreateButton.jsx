import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';

/**
 * Small floating "+" — visible only while parent cell is hovered (CSS).
 */
export default function HoverCreateButton({
  dateStr,
  timeStr,
  onClick,
  disabled = false,
  label,
  slotCorner = false,
  pinnedTop = false,
  dayHoverTop = false,
}) {
  if (disabled) return null;

  const cls = [
    'bb-cal-hover-create',
    slotCorner ? 'bb-cal-hover-create--slot' : '',
    pinnedTop ? 'bb-cal-hover-create--pinned' : '',
    dayHoverTop ? 'bb-cal-hover-create--day-top' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cls}
      aria-label={label || `Create post on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`}
      title="Create post"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(dateStr, timeStr, e);
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
  timeStr: PropTypes.string,
  slotCorner: PropTypes.bool,
  pinnedTop: PropTypes.bool,
  dayHoverTop: PropTypes.bool,
};
