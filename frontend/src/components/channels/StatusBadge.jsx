/* ============================================================================
 * StatusBadge — connected / expired / not connected chip.
 * ========================================================================== */
export default function StatusBadge({
  status = 'not_connected',
  label,
  className = '',
}) {
  const resolved = String(status || 'not_connected').toLowerCase();
  const text = label || ({
    active: 'Connected',
    connected: 'Connected',
    expired: 'Expired',
    not_connected: 'Not connected',
  })[resolved] || 'Not connected';

  const tone = ({
    active: 'ok',
    connected: 'ok',
    expired: 'warn',
    not_connected: 'muted',
  })[resolved] || 'muted';

  return (
    <span
      className={['status-badge', `status-badge--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {text}
    </span>
  );
}
