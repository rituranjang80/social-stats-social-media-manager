import { Check } from 'lucide-react';

/**
 * Connection-state check indicator — checked (connected) / unchecked (not).
 * Reusable across Settings, Composer, onboarding, etc.
 */
export default function TPlatformCheck({
  checked = false,
  expired = false,
  label,
  size = 18,
  className = '',
}) {
  const state = checked ? (expired ? 'expired' : 'checked') : 'unchecked';
  const sizeClass = size >= 20 ? 't-platform-check--lg' : 't-platform-check--md';
  const classes = [
    't-platform-check',
    sizeClass,
    `t-platform-check--${state}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      role="img"
      aria-label={label || (checked ? (expired ? 'Expired' : 'Connected') : 'Not connected')}
    >
      {checked ? (
        <Check size={size >= 20 ? 12 : 10} strokeWidth={3} aria-hidden="true" />
      ) : null}
    </span>
  );
}
