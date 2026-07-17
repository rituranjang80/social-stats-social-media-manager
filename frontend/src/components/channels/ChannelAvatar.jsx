/* ============================================================================
 * ChannelAvatar — image or initials (SCSS, theme-aware).
 * ========================================================================== */
import { useMemo, useState } from 'react';

function initialsFrom(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ChannelAvatar({
  src,
  name = '',
  size = 'md',
  className = '',
  alt,
}) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => initialsFrom(name), [name]);

  return (
    <span
      className={[
        'channel-avatar',
        `channel-avatar--${size}`,
        className,
      ].filter(Boolean).join(' ')}
      role={src && !failed ? 'img' : undefined}
      aria-label={alt || name || undefined}
    >
      {src && !failed ? (
        <img
          className="channel-avatar__img"
          src={src}
          alt={alt || name || ''}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="channel-avatar__initials" aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
