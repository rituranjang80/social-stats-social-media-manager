import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import TPlatformCheck from './TPlatformCheck';

/**
 * SS-inspired social connect card — icon + check/unchecked + action.
 * Plug-and-play for Settings, onboarding, My Connections, etc.
 *
 * isConfigured = app credentials present in .env (SS is_configured)
 * oauthEnabled/connectable = Quick Connect start URL available
 */
export default function TSocialConnectCard({
  platformId,
  label,
  subtitle,
  variant = 'glass-light',
  connected = false,
  expired = false,
  accountName = '',
  oauthEnabled = true,
  isConfigured = null,
  groupNote = null,
  expiresAt = null,
  loading = false,
  onConnect,
  onDisconnect,
}) {
  const configured = isConfigured == null ? oauthEnabled : isConfigured;
  const canConnect = configured && oauthEnabled;

  const stateClass = connected
    ? (expired ? 'is-expired' : 'is-connected')
    : (canConnect ? 'is-available' : 'is-unconfigured');

  return (
    <article
      className={`t-social-card t-social-card--${variant} ${stateClass}`}
      data-platform={platformId}
    >
      <div className="t-social-card__glow" aria-hidden="true" />
      <div className="t-social-card__inner">
        <div className="t-social-card__head">
          <div className="t-social-card__icon-wrap">
            <SocialPlatformIcon platform={platformId} size={28} title={label} />
            <TPlatformCheck
              checked={connected}
              expired={expired}
              className="t-social-card__check"
              size={18}
            />
          </div>
          <div className="t-social-card__titles">
            <h3 className="t-social-card__title">{label}</h3>
            {subtitle && <p className="t-social-card__subtitle">{subtitle}</p>}
            {accountName && (
              <p className="t-social-card__account">@{accountName}</p>
            )}
          </div>
        </div>

        <div className="t-social-card__status">
          {connected && !expired && <span className="t-social-card__pill t-social-card__pill--ok">Connected</span>}
          {expired && <span className="t-social-card__pill t-social-card__pill--warn">Expired</span>}
          {!connected && canConnect && (
            <span className="t-social-card__pill">Ready to connect</span>
          )}
          {!connected && !canConnect && (
            <span className="t-social-card__pill t-social-card__pill--muted">Not configured</span>
          )}
        </div>

        {expiresAt && connected && (
          <p className="t-social-card__expiry">
            Token expires: {new Date(expiresAt).toLocaleDateString()}
          </p>
        )}

        {groupNote && <p className="t-social-card__note">{groupNote}</p>}

        <div className="t-social-card__actions">
          {connected ? (
            <button
              type="button"
              className="t-social-card__btn t-social-card__btn--disconnect"
              onClick={onDisconnect}
              disabled={loading}
            >
              {loading ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : canConnect ? (
            <button
              type="button"
              className="t-social-card__btn t-social-card__btn--connect"
              onClick={onConnect}
              disabled={loading}
            >
              <span>Connect</span>
              <span className="t-social-card__arrow" aria-hidden="true">→</span>
            </button>
          ) : (
            <span
              className="t-social-card__btn t-social-card__btn--disabled"
              title="Add PLATFORM_* credentials in SocialMediaStart/.env"
            >
              Not Configured
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
