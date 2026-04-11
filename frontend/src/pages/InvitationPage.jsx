/**
 * InvitationPage — /invitation/:token
 * Fetches invitation details (public endpoint).
 * If not logged in → store token in localStorage and redirect to /login.
 * If logged in → show Accept / Reject UI.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { invitationAPI } from '../services/api';
import { CheckCircle, XCircle, Clock, Loader2, Building2 } from 'lucide-react';
import { StatoxLogoHorizontal } from '../components/ui/StatoxLogo';

const CYAN = '#00d7ff';

export default function InvitationPage() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const { user, refreshAuth } = useAuth();

  const [inv, setInv]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [responding, setResponding] = useState('');
  const [done, setDone]       = useState('');

  useEffect(() => {
    invitationAPI.getByToken(token)
      .then(res => setInv(res.data))
      .catch(e => setError(e?.response?.data?.error || 'Invitation not found.'))
      .finally(() => setLoading(false));
  }, [token]);

  // If not logged in, save token and redirect to login
  useEffect(() => {
    if (!loading && inv && !user) {
      localStorage.setItem('pending_invite_token', token);
      navigate('/login?next=/invitation/' + token, { replace: true });
    }
  }, [loading, inv, user, token, navigate]);

  const handleRespond = async (action) => {
    setResponding(action);
    setError('');
    try {
      const res = await invitationAPI.respond(token, action);
      if (action === 'accept') {
        await refreshAuth(res.data.access, res.data.refresh);
        setDone('accepted');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } else {
        setDone('rejected');
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Something went wrong.');
    } finally {
      setResponding('');
    }
  };

  return (
    <div style={s.page}>
      <header style={s.topBar}>
        <StatoxLogoHorizontal height={30} />
      </header>

      <div style={s.center}>
        <div style={s.card}>
          {loading ? (
            <div style={s.spinRow}>
              <Loader2 size={28} style={{ animation: 'spin .8s linear infinite', color: CYAN }} />
              <p style={s.sub}>Loading invitation…</p>
            </div>
          ) : error ? (
            <>
              <div style={{ ...s.iconWrap, background: '#fef2f2' }}>
                <XCircle size={28} color='#dc2626' />
              </div>
              <h2 style={s.title}>Invitation Not Found</h2>
              <p style={s.sub}>{error}</p>
              <Link to="/login" style={s.link}>Back to login</Link>
            </>
          ) : done === 'accepted' ? (
            <>
              <div style={{ ...s.iconWrap, background: '#f0fdf4' }}>
                <CheckCircle size={28} color='#16a34a' />
              </div>
              <h2 style={s.title}>Invitation Accepted!</h2>
              <p style={s.sub}>Redirecting to your dashboard…</p>
            </>
          ) : done === 'rejected' ? (
            <>
              <div style={{ ...s.iconWrap, background: '#fef2f2' }}>
                <XCircle size={28} color='#dc2626' />
              </div>
              <h2 style={s.title}>Invitation Rejected</h2>
              <p style={s.sub}>You've declined the invitation from <strong>{inv?.agency_name}</strong>.</p>
              <Link to="/pending" style={s.link}>Back to dashboard</Link>
            </>
          ) : inv?.is_expired || inv?.status === 'expired' ? (
            <>
              <div style={{ ...s.iconWrap, background: '#fffbeb' }}>
                <Clock size={28} color='#d97706' />
              </div>
              <h2 style={s.title}>Invitation Expired</h2>
              <p style={s.sub}>This invitation has expired. Ask the agency to send a new one.</p>
              <Link to="/login" style={s.link}>Back to login</Link>
            </>
          ) : inv?.status !== 'pending' ? (
            <>
              <div style={{ ...s.iconWrap, background: '#f8fafc' }}>
                <Building2 size={28} color='#64748b' />
              </div>
              <h2 style={s.title}>Already Responded</h2>
              <p style={s.sub}>This invitation was already {inv?.status}.</p>
              <Link to="/dashboard" style={s.link}>Go to dashboard</Link>
            </>
          ) : (
            <>
              <div style={{ ...s.iconWrap, background: `rgba(0,215,255,.1)` }}>
                <Building2 size={28} color={CYAN} />
              </div>
              <h2 style={s.title}>Agency Invitation</h2>
              <p style={s.agencyName}>{inv.agency_name}</p>
              <p style={s.agencyEmail}>{inv.agency_email}</p>

              {inv.message && (
                <div style={s.msgBox}>
                  <p style={s.msgText}>"{inv.message}"</p>
                </div>
              )}

              <p style={s.sub}>
                {inv.agency_name} wants to manage your social media analytics on StatoX.
              </p>

              {error && <div style={s.errorBox}>{error}</div>}

              <div style={s.btnRow}>
                <button
                  style={{ ...s.acceptBtn, opacity: responding ? 0.7 : 1 }}
                  disabled={!!responding}
                  onClick={() => handleRespond('accept')}
                >
                  {responding === 'accept'
                    ? <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />
                    : <CheckCircle size={15} />
                  }
                  Accept
                </button>
                <button
                  style={{ ...s.rejectBtn, opacity: responding ? 0.7 : 1 }}
                  disabled={!!responding}
                  onClick={() => handleRespond('reject')}
                >
                  {responding === 'reject'
                    ? <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />
                    : <XCircle size={15} />
                  }
                  Reject
                </button>
              </div>
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
    background: '#fff',
    borderBottom: '1px solid #e8edf2',
    padding: '14px 32px',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  },
  center: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '48px 44px',
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,.08)',
    border: '1px solid #e8edf2',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  spinRow:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title:    { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  sub:      { margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.6 },
  agencyName: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  agencyEmail:{ margin: 0, fontSize: 13, color: '#64748b' },
  msgBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  msgText: { margin: 0, fontSize: 13, color: '#475569', fontStyle: 'italic' },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  },
  btnRow: { display: 'flex', gap: 12, marginTop: 8 },
  acceptBtn: {
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: '#dcfce7', color: '#166534', border: '1px solid #86efac',
    borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
    borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  link: { color: CYAN, textDecoration: 'none', fontSize: 14, fontWeight: 600 },
};
