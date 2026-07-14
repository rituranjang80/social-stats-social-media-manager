/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo, useState } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import { oauthAPI } from '../../services/api';
import { isPlatformConnected } from '../../constants/socialPlatforms';
import { TSocialConnectCard, TPlatformCheck } from '../t';
import FacebookConnectModal from '../FacebookConnectModal';
import '../../styles/scss/settings-connect.scss';

function startConnectUrl(clientId, card) {
  if (!clientId || !card?.connectable) return null;
  if (card.oauth_provider === 'facebook') return oauthAPI.facebookUrl(clientId);
  if (card.oauth_provider === 'google') {
    return oauthAPI.googleUrl(clientId, card.google_platform || 'all');
  }
  if (card.oauth_provider === 'linkedin') return oauthAPI.linkedinUrl(clientId);
  return null;
}

export default function ConnectedAccounts({
  clientId,
  status = {},
  catalog = [],
  onRefresh,
}) {
  const [loading, setLoading] = useState({});
  const [fbConsentOpen, setFbConsentOpen] = useState(false);
  const [pendingFbCard, setPendingFbCard] = useState(null);

  const cards = useMemo(() => {
    if (Array.isArray(catalog) && catalog.length) return catalog;
    // Fallback: build from flat status map
    return Object.keys(status).map((id) => {
      const s = status[id] || {};
      return {
        id,
        label: id,
        subtitle: '',
        variant: 'glass-light',
        is_configured: !!s.is_configured || !!s.connectable || !!s.oauth_enabled,
        connectable: !!(s.connectable || s.oauth_enabled),
        oauth_provider: s.oauth_provider,
        google_platform: s.google_platform,
        credential_key: s.credential_key || id,
        status: s.status || 'not_connected',
        account_name: s.account_name || '',
        expires_at: s.expires_at,
      };
    });
  }, [catalog, status]);

  const counts = useMemo(() => {
    let connected = 0;
    let configured = 0;
    cards.forEach((c) => {
      if (c.is_configured) configured += 1;
      if (isPlatformConnected({ status: c.status })) connected += 1;
    });
    return { connected, configured, total: cards.length };
  }, [cards]);

  const handleConnect = (card) => {
    if (!clientId) {
      window.alert('Your client workspace is still being prepared. Please refresh the page and try again.');
      return;
    }
    if (!card.is_configured) return;
    if (!card.connectable) {
      window.alert(
        `${card.label} app credentials are set, but Quick Connect for this channel is not wired yet. `
        + 'Add keys in SocialMediaStart/.env or use Manual Setup where available.',
      );
      return;
    }
    if (card.oauth_provider === 'facebook') {
      setPendingFbCard(card);
      setFbConsentOpen(true);
      return;
    }
    const url = startConnectUrl(clientId, card);
    if (url) window.location.href = url;
  };

  const handleFbConsentContinue = () => {
    if (clientId) window.location.href = oauthAPI.facebookUrl(clientId);
  };

  const handleDisconnect = async (card) => {
    const key = card.credential_key || card.id;
    if (!window.confirm(`Disconnect ${card.label}? Sync will stop.`)) return;
    setLoading((l) => ({ ...l, [card.id]: true }));
    try {
      await oauthAPI.disconnect(clientId, key);
      onRefresh?.();
    } finally {
      setLoading((l) => ({ ...l, [card.id]: false }));
    }
  };

  return (
    <section className="connect-accounts" aria-labelledby="connect-accounts-title">
      <header className="connect-accounts__header">
        <h2 id="connect-accounts-title" className="connect-accounts__title">
          Connect a Platform
        </h2>
        <p className="connect-accounts__sub">
          Platforms with app credentials in SocialMediaStart <code>.env</code> show
          Connect. Empty credentials show Not Configured (SS-style). Connection state
          uses a checkmark when your account is linked.
        </p>
        <div className="connect-accounts__summary" aria-live="polite">
          <span className="connect-accounts__stat">
            <TPlatformCheck checked size={16} />
            {counts.connected} connected
          </span>
          <span className="connect-accounts__stat">
            <TPlatformCheck checked={false} size={16} />
            {counts.total - counts.connected} unchecked
          </span>
          <span className="connect-accounts__stat">
            {counts.configured} configured in .env
          </span>
        </div>
      </header>

      <div className="connect-accounts__grid" role="list">
        {cards.map((card) => {
          const connected = isPlatformConnected({ status: card.status });
          const expired = card.status === 'expired';
          const fbActive = (status.facebook || {}).status === 'active'
            || cards.some((c) => c.id === 'facebook' && c.status === 'active');
          const groupNote = card.id === 'instagram' && fbActive && connected
            ? (
              <span className="connect-accounts__via">
                <Zap size={13} aria-hidden="true" />
                Connected via Facebook
              </span>
            )
            : null;

          return (
            <div key={card.id} role="listitem">
              <TSocialConnectCard
                platformId={card.icon || card.id}
                label={card.label}
                subtitle={card.subtitle}
                variant={card.variant || 'glass-light'}
                connected={connected}
                expired={expired}
                accountName={card.account_name || ''}
                oauthEnabled={!!card.connectable}
                isConfigured={!!card.is_configured}
                expiresAt={card.expires_at}
                groupNote={groupNote}
                loading={!!loading[card.id]}
                onConnect={() => handleConnect(card)}
                onDisconnect={() => handleDisconnect(card)}
              />
            </div>
          );
        })}
      </div>

      <FacebookConnectModal
        appName="Social Stats"
        open={fbConsentOpen}
        onClose={() => { setFbConsentOpen(false); setPendingFbCard(null); }}
        onContinue={handleFbConsentContinue}
      />

      <aside className="connect-accounts__help">
        <p className="connect-accounts__help-title">
          <Lightbulb size={14} aria-hidden="true" />
          How configuration works
        </p>
        <ul className="connect-accounts__help-list">
          <li>
            Set <code>PLATFORM_*</code> keys in <strong>C:\app\SocialMediaStart\.env</strong>, then
            restart Docker. Configured platforms show a Connect button.
          </li>
          <li>
            Control the list with <code>CONNECT_PLATFORMS=facebook,instagram,...</code> and
            optional <code>PLATFORM_&lt;ID&gt;_ENABLED=false</code>.
          </li>
          <li>Checkmark = your workspace account is linked; empty circle = not linked.</li>
          <li>Facebook &amp; Instagram share Meta login. YouTube &amp; Google Business share Google.</li>
        </ul>
      </aside>
    </section>
  );
}
