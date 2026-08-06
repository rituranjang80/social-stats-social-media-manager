/* Shared user avatar — photo when available, initials fallback. */
import { resolveMediaUrl } from '../media/mediaUtils';

export function getUserDisplayName(user) {
  if (!user) return 'Account';
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.name) return String(user.name).trim();
  return user.email || 'Account';
}

export function getUserInitials(user) {
  const name = getUserDisplayName(user);
  if (name && name !== 'Account' && !name.includes('@')) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0][0] || 'U').toUpperCase();
  }
  return ((user?.email || 'U').trim()[0] || 'U').toUpperCase();
}

export function getUserAvatarUrl(user) {
  if (!user) return '';
  const raw = user.avatar || user.profile_image || user.profile_image_url || user.avatar_url || '';
  return resolveMediaUrl(typeof raw === 'string' ? raw : String(raw || ''));
}

export function hashUserHue(seed) {
  let h = 0;
  const s = seed || '';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

/**
 * @param {object} props
 * @param {object} props.user — auth user from /auth/me/
 * @param {string} [props.className] — outer circle class (e.g. ds-topbar-account__avatar)
 * @param {string} [props.imageClassName] — img class (default ds-user-avatar__img)
 */
export default function UserAvatar({
  user,
  className = '',
  imageClassName = 'ds-user-avatar__img',
  style,
  title,
}) {
  const url = getUserAvatarUrl(user);
  const initial = getUserInitials(user);
  const hue = hashUserHue(user?.email || getUserDisplayName(user));
  const label = title || getUserDisplayName(user);

  if (url) {
    return (
      <span
        className={`${className} ds-user-avatar--photo`.trim()}
        style={style}
        title={label}
        aria-hidden={title ? undefined : 'true'}
      >
        <img
          src={url}
          alt={title ? label : ''}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ ...style, '--ds-avatar-hue': hue }}
      aria-hidden={title ? undefined : 'true'}
      title={title}
    >
      {initial}
    </span>
  );
}
