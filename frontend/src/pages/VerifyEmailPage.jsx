/**
 * VerifyEmailPage — /verify-email?token=UUID
 * Called when user clicks the link in their verification email.
 * Verifies token → stores JWT → redirects to /pending.
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { StatoxLogoHorizontal } from '../components/ui/StatoxLogo';

const CYAN = '#00d7ff';

export default function VerifyEmailPage() {
  const navigate     = useNavigate();
  const { refreshAuth } = useAuth();
  const token        = new URLSearchParams(window.location.search).get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    authAPI.verifyEmail(token)
      .then(async res => {
        const { access, refresh } = res.data;
        await refreshAuth(access, refresh);
        setStatus('success');
        setTimeout(() => navigate('/pending', { replace: true }), 2000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(
          err?.response?.data?.error ||
          'This verification link is invalid or has expired.'
        );
      });
  }, []); // run once on mount — token comes from URL, won't change

  return (
    <div style={s.page}>
      <header style={s.topBar}>
        <StatoxLogoHorizontal height={30} />
      </header>

      <div style={s.center}>
        <div style={s.card}>
          {status === 'loading' && (
            <>
              <Loader2 size={40} style={{ animation: 'spin .8s linear infinite', color: CYAN, marginBottom: 20 }} />
              <h2 style={s.title}>Verifying your email...</h2>
              <p style={s.sub}>Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={s.iconWrap}>
                <CheckCircle size={40} color={CYAN} />
              </div>
              <h2 style={s.title}>Email verified!</h2>
              <p style={s.sub}>Your account is now active. Redirecting you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ ...s.iconWrap, background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.2)' }}>
                <XCircle size={40} color="#dc2626" />
              </div>
              <h2 style={s.title}>Verification failed</h2>
              <p style={s.sub}>{message}</p>
              <Link to="/signup" style={s.btn}>
                Back to Sign Up
              </Link>
              <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>
                Already verified?{' '}
                <Link to="/login" style={{ color: CYAN, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f4f9', display: 'flex', flexDirection: 'column' },
  topBar: {
    background: '#fff', borderBottom: '1px solid #e8edf2',
    padding: '14px 32px', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  },
  center: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: {
    background: '#fff', borderRadius: 24, padding: '52px 48px', maxWidth: 420, width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,.08)', border: '1px solid #e8edf2',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'rgba(0,215,255,0.08)', border: '2px solid rgba(0,215,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { margin: '0 0 10px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  sub:   { margin: '0 0 28px', fontSize: 15, color: '#64748b', lineHeight: 1.6 },
  btn: {
    display: 'inline-block', background: CYAN, color: '#021418', fontWeight: 700,
    fontSize: 14, padding: '12px 28px', borderRadius: 12, textDecoration: 'none',
    marginBottom: 4,
  },
};
