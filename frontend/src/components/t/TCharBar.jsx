/**
 * Character usage bar + optional per-platform meta line.
 */
export default function TCharBar({ used = 0, max = 100, items = [] }) {
  const ratio = max > 0 ? Math.min(1, used / max) : 0;
  const over = used > max;
  const warn = !over && ratio >= 0.85;
  const progressClass = [
    't-char-bar',
    over ? 't-char-bar--over' : '',
    warn ? 't-char-bar--warn' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="t-char-bar-wrap">
      <progress
        className={progressClass}
        value={Math.min(used, max)}
        max={Math.max(max, 1)}
        aria-label={`${used} of ${max} characters used`}
        aria-valuetext={over ? `${used - max} characters over the limit` : undefined}
      />
      {items.length > 0 && (
        <div className="t-char-bar__meta">
          {items.map((it) => (
            <span
              key={it.id}
              className={it.over ? 't-char-bar__meta-item--over' : undefined}
            >
              {it.label}: {it.used}/{it.max}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
