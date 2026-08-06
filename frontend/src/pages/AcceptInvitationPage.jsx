/**
 * AcceptInvitationPage — /accept-invitation/:token
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import { BRAND_NAME } from '../config/branding';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { invitationAPI, authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

import '../styles/scss/pages/_accept-invitation.scss';

function finishLogin(access, refresh, refreshAuth) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  localStorage.removeItem('pending_invite_token');
  return refreshAuth(access, refresh).catch(() => authAPI.me().then((me) => me.data));
}

function goToClientHome() {
  window.location.replace('/dashboard');
}

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const { refreshAuth } = useAuth();
  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setMessage('Invitation link is missing a token.');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await invitationAPI.acceptMagic(token);
        const access = res.data?.access;
        const refresh = res.data?.refresh;
        if (!access || !refresh) {
          if (!cancelled) {
            setMessage('Sign-in tokens were not returned. Ask your administrator to resend the invitation.');
            setPhase('error');
          }
          return;
        }

        await finishLogin(access, refresh, refreshAuth);

        if (cancelled) {
          goToClientHome();
          return;
        }

        setPhase('ok');
        goToClientHome();
      } catch (e) {
        if (cancelled) return;
        const err = e?.response?.data?.error
          || e?.userMessage
          || e?.message
          || 'This invitation link is not valid.';
        setMessage(typeof err === 'string' ? err : 'This invitation link is not valid.');
        setPhase(String(err).toLowerCase().includes('expired') ? 'expired' : 'error');
      }
    })();

    return () => { cancelled = true; };
  }, [token, refreshAuth]);

  let content;
  if (phase === 'loading') {
    content = <CenteredState icon={<Spinner size="md" />} title="Accepting your invitation…" />;
  } else if (phase === 'ok') {
    content = (
      <CenteredState
        icon={<CheckCircle size={28} />}
        title="You're in!"
        description={`Welcome to ${BRAND_NAME}. Redirecting to your dashboard…`}
      />
    );
  } else if (phase === 'expired') {
    content = (
      <CenteredState
        icon={<Clock size={28} />}
        title="Invitation expired"
        description={message || 'Ask your administrator to resend the invitation from the Clients page.'}
        action={<Button as={Link} to="/login" variant="secondary" fullWidth>Go to login</Button>}
      />
    );
  } else {
    content = (
      <CenteredState
        icon={<XCircle size={28} />}
        title="Could not accept invitation"
        description={message}
        action={<Button as={Link} to="/login" variant="secondary" fullWidth>Go to login</Button>}
      />
    );
  }

  return (
    <AuthLayout
      heroTitle={`Welcome to ${BRAND_NAME}`}
      heroSub="Secure one-click access from your invitation link."
    >
      {content}
    </AuthLayout>
  );
}

function CenteredState({ icon, title, description, action }) {
  return (
    <div className="accept-invite-card">
      <div className="accept-invite-card__icon" aria-hidden="true">{icon}</div>
      {title && <h1 className="accept-invite-card__title">{title}</h1>}
      {description && <p className="accept-invite-card__desc">{description}</p>}
      {action && <div className="accept-invite-card__action">{action}</div>}
    </div>
  );
}
