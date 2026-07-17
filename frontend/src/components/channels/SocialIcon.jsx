/* ============================================================================
 * SocialIcon — thin wrapper around SocialPlatformIcon for channel cards.
 * ========================================================================== */
import SocialPlatformIcon from '../ui/SocialPlatformIcon';

export default function SocialIcon({
  platform,
  size = 14,
  title,
  className = '',
}) {
  return (
    <span
      className={['social-icon', platform ? `social-icon--${platform}` : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={title ? undefined : true}
    >
      <SocialPlatformIcon platform={platform} size={size} title={title} />
    </span>
  );
}
