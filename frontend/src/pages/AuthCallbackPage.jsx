/* ============================================================================
 *  AuthCallbackPage — OAuth return URL: /auth/callback?code=…
 *  Shows loading while POST /api/auth/social/exchange/ returns JWTs, then /me.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

/** One shared promise per code (StrictMode-safe: both mounts await the same exchange). */
const exchangePromises = new Map();
/** Ensure we only apply tokens + navigate once per code. */
const finishedCodes = new Set();

function exchangeCodeOnce(code) {
  if (exchangePromises.has(code)) {
    return exchangePromises.get(code);
  }
  const promise = authAPI.exchangeSocialCode(code)
    .then((res) => {
      const tokens = res.data || {};
      if (!tokens.access || !tokens.refresh) {
        throw new Error('missing tokens');
      }
      return tokens;
    });
  exchangePromises.set(code, promise);
  return promise;
}

function navigateAfterProfile(user, state, navigate) {
  const role = user.role;
  const onboardingComplete = user.onboarding_complete;
  const clientId = user.client_id;
  if (role === 'superadmin' || role === 'staff') {
    navigate('/admin', { replace: true });
  } else if (user.account_type === 'end_user') {
    navigate('/u', { replace: true });
  } else if (state === 'self' || (role === 'client' && !clientId)) {
    navigate('/pending', { replace: true });
  } else if (!onboardingComplete) {
    navigate('/dashboard/onboarding', { replace: true });
  } else {
    navigate('/dashboard', { replace: true });
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | exchange | profile

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error');
    const code = params.get('code');
    const access = params.get('access');
    const refresh = params.get('refresh');
    const state = params.get('state');

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      setTimeout(() => navigate('/login', { replace: true }), 3500);
      return undefined;
    }

    async function finishWithTokens(finishKey, accessToken, refreshToken) {
      if (finishedCodes.has(finishKey)) return;
      finishedCodes.add(finishKey);
      setPhase('profile');
      const user = await refreshAuth(accessToken, refreshToken);
      navigateAfterProfile(user, state, navigate);
    }

    if (code) {
      // Drop stale JWTs so nothing else sends them while we exchange the OAuth code.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      setPhase('exchange');

      exchangeCodeOnce(code)
        .then(async (tokens) => {
          window.history.replaceState({}, '', '/auth/callback');
          await finishWithTokens(code, tokens.access, tokens.refresh);
        })
        .catch((err) => {
          if (finishedCodes.has(code)) return;
          const msg = err?.response?.data?.error;
          setError(
            typeof msg === 'string' && msg
              ? msg
              : 'Sign-in link expired. Redirecting to login…',
          );
          setTimeout(() => navigate('/login', { replace: true }), 2500);
        });

      return undefined;
    }

    if (access && refresh) {
      finishWithTokens('legacy-query', access, refresh).catch(() => {
        localStorage.clear();
        setError('Authentication failed. Redirecting to login…');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      });
      return undefined;
    }

    setError('Missing sign-in code. Redirecting to login…');
    setTimeout(() => navigate('/login', { replace: true }), 2000);
    return undefined;
  }, [navigate, refreshAuth]);

  const message =
    phase === 'profile'
      ? 'Loading your profile…'
      : 'Completing sign-in…';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.errorIcon} aria-hidden>✕</div>
            <p style={styles.errorText}>{error}</p>
          </>
        ) : (
          <>
            <div style={styles.spinner} role="status" aria-live="polite">
              <span className="sr-only">{message}</span>
            </div>
            <p style={styles.msg}>{message}</p>
            <p style={styles.sub}>Signing you in securely</p>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-page)',
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: 20,
    padding: '48px 56px',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,.4)',
    minWidth: 280,
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid var(--border-default)',
    borderTopColor: '#00d7ff',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 0.8s linear infinite',
  },
  msg: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' },
  sub: { fontSize: 13, color: 'var(--text-secondary)', margin: 0 },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#fef2f2',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 auto 16px',
  },
  errorText: { fontSize: 14, color: '#dc2626', margin: 0 },
};
