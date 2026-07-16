/* ============================================================================
 * Generic CSS-grid layout — cols/gap via SCSS modifiers (no inline styles).
 * ========================================================================== */
const GAP_ALLOWLIST = new Set([4, 6, 8, 10, 12, 16]);

function normalizeCols(cols) {
  const n = Number(cols);
  if (!Number.isFinite(n)) return 4;
  return Math.min(12, Math.max(1, Math.round(n)));
}

function normalizeGap(gap) {
  if (typeof gap === 'number' && GAP_ALLOWLIST.has(gap)) return gap;
  const match = String(gap || '').match(/(\d+)/);
  const n = match ? Number(match[1]) : 8;
  if (GAP_ALLOWLIST.has(n)) return n;
  return 8;
}

export default function TGrid({
  children,
  cols = 4,
  gap = '8px',
  className = '',
}) {
  const colN = normalizeCols(cols);
  const gapN = normalizeGap(gap);
  const classes = [
    't-grid',
    `t-grid--cols-${colN}`,
    `t-grid--gap-${gapN}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

export { TGrid };
