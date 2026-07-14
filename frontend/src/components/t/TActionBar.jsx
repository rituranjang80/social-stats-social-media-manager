/**
 * Sticky action bar for compose / form footers.
 */
export default function TActionBar({ left, right, hint, className = '' }) {
  return (
    <div className={`t-action-bar ${className}`.trim()} role="toolbar">
      {left}
      <div className="t-action-bar__spacer" />
      {hint ? <span className="t-action-bar__hint">{hint}</span> : null}
      {right}
    </div>
  );
}
