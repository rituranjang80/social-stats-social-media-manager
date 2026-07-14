/**
 * Character usage bar + optional per-platform meta line.
 */
export default function TCharBar({ used = 0, max = 100, items = [] }) {
  const ratio = max > 0 ? Math.min(1, used / max) : 0;
  const over = used > max;
  const warn = !over && ratio >= 0.85;
  const fillClass = [
    't-char-bar__fill',
    over ? 't-char-bar__fill--over' : '',
    warn ? 't-char-bar__fill--warn' : '',
  ].filter(Boolean).join(' ');

  return (
    <div>
      <div className="t-char-bar" aria-hidden="true">
        <div className={fillClass} style={{ width: `${ratio * 100}%` }} />
      </div>
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
