import { Check } from 'lucide-react';

/**
 * Generic selectable pill (platforms, filters, modes).
 */
export default function TPill({
  selected = false,
  onClick,
  children,
  icon,
  showCheck = false,
  color,
  className = '',
  ariaPressed,
  type = 'button',
  ...rest
}) {
  const classes = [
    't-pill',
    selected ? 't-pill--selected' : '',
    color ? 't-pill--platform' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      aria-pressed={ariaPressed ?? selected}
      style={selected && color ? { background: color } : undefined}
      {...rest}
    >
      {showCheck && (
        <span className="t-pill__check" aria-hidden="true">
          {selected ? <Check size={10} strokeWidth={3} /> : null}
        </span>
      )}
      {icon || null}
      {children}
    </button>
  );
}
