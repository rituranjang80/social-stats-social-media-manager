/* ============================================================================
 * Compact channel / feature icon with optional connected check badge.
 * Matches T-Type SCSS architecture (icon-container + badge).
 * ========================================================================== */
export default function TIconBadge({
  icon,
  isConnected = false,
  isSelected = false,
  title,
  onClick,
  disabled = false,
  className = '',
}) {
  const classes = [
    't-icon-badge',
    isConnected ? 'is-connected' : 'is-disconnected',
    isSelected ? 'is-selected' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected || isConnected}
      title={title}
      aria-label={title}
    >
      <div className="icon-container">{icon}</div>
      {isConnected && (
        <span className="badge" aria-hidden="true">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      )}
    </button>
  );
}

export { TIconBadge };
