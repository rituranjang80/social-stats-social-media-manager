/**
 * Sticky action bar for compose / form footers.
 */
export default function TActionBar({
  left,
  right,
  hint,
  status,
  ariaBusy = false,
  ariaLabel = 'Form actions',
  className = '',
}) {
  return (
    <div
      className={`t-action-bar ${className}`.trim()}
      role="toolbar"
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
    >
      {left}
      <div className="t-action-bar__spacer" />
      {hint ? <span className="t-action-bar__hint">{hint}</span> : null}
      {status ? (
        <span className="t-action-bar__status" role="status" aria-live="polite">
          {status}
        </span>
      ) : null}
      {right}
    </div>
  );
}
