/**
 * ResetPasswordPage
 * /reset-password?token=UUID — set new password
 * /forgot-password — request reset link
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { StatoxLogoHorizontal } from '../components/ui/StatoxLogo';

const CYAN      = '#00d7ff';
const CYAN_SOFT = 'rgba(31, 182, 207, 0.16)';

function ForgotPasswordForm() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setError(''); setLoading(true);
    try {
      await authAPI.passwordResetRequest(email.trim().toLowerCase());
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={s.card}>
      <div style={s.iconWrap}><CheckCircle size={40} color={CYAN} /></div>
      <h2 style={s.title}>Check your inbox</h2>
      <p style={s.sub}>
        If <strong style={{ color: '#0f172a' }}>{email}</strong> is registered, you'll receive a reset link shortly.
      </p>
      <Link to="/login" style={s.btn}>Back to Sign In</Link>
    </div>
  );

  return (
    <div style={s.card}>
      <h2 style={s.title}>Reset your password</h2>
      <p style={{ ...s.sub, marginBottom: 28 }}>Enter your email and we'll send a reset link.</p>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <div style={s.inputWrap(focused, !!error)}>
            <Mail size={16} color={focused ? CYAN : '#6B7D85'} style={{ flexShrink: 0 }} />
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="you@company.com" style={s.input}
            />
          </div>
          {error && <div style={s.fieldError}>{error}</div>}
        </div>
        <button type="submit" disabled={loading} style={s.primaryBtn}>
          {loading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
            : <><span>Send Reset Link</span><ArrowRight size={16} /></>
          }
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
        <Link to="/login" style={{ color: CYAN, fontWeight: 600, textDecoration: 'none' }}>Back to Sign In</Link>
      </p>
    </div>
  );
}

function ResetPasswordForm({ token }) {
  const navigate = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [focused, setFocused]     = useState('');
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.passwordResetConfirm(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.password) setErrors(prev => ({ ...prev, password: data.errors.password }));
      else setServerError(data?.error || 'This reset link is invalid or has expired.');
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={s.card}>
      <div style={s.iconWrap}><CheckCircle size={40} color={CYAN} /></div>
      <h2 style={s.title}>Password reset!</h2>
      <p style={s.sub}>Your password has been updated. Redirecting to sign in...</p>
    </div>
  );

  return (
    <div style={s.card}>
      <h2 style={s.title}>Set new password</h2>
      <p style={{ ...s.sub, marginBottom: 24 }}>Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={s.field}>
          <label style={s.label}>New Password</label>
          <div style={s.inputWrap(focused === 'pwd', !!errors.password)}>
            <Lock size={16} color={focused === 'pwd' ? CYAN : '#6B7D85'} style={{ flexShrink: 0 }} />
            <input
              type={showPwd ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
              onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')}
              placeholder="At least 8 characters" style={s.input}
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} style={s.eyeBtn}>
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <div style={s.fieldError}>{errors.password}</div>}
        </div>

        <div style={s.field}>
          <label style={s.label}>Confirm Password</label>
          <div style={s.inputWrap(focused === 'conf', !!errors.confirm)}>
            <Lock size={16} color={focused === 'conf' ? CYAN : '#6B7D85'} style={{ flexShrink: 0 }} />
            <input
              type={showConf ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
              onFocus={() => setFocused('conf')} onBlur={() => setFocused('')}
              placeholder="Re-enter password" style={s.input}
            />
            <button type="button" onClick={() => setShowConf(v => !v)} style={s.eyeBtn}>
              {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirm && <div style={s.fieldError}>{errors.confirm}</div>}
        </div>

        {serverError && (
          <div style={{ ...s.fieldError, background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
            {serverError}
          </div>
        )}

        <button type="submit" disabled={loading} style={s.primaryBtn}>
          {loading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
            : <><span>Set New Password</span><ArrowRight size={16} /></>
          }
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token');

  return (
    <div style={s.page}>
      <header style={s.topBar}>
        <StatoxLogoHorizontal height={30} />
      </header>
      <div style={s.center}>
        {token ? <ResetPasswordForm token={token} /> : <ForgotPasswordForm />}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: '#f0f4f9', display: 'flex', flexDirection: 'column' },
  topBar: { background: '#fff', borderBottom: '1px solid #e8edf2', padding: '14px 32px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  center: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: {
    background: '#fff', borderRadius: 24, padding: '48px 44px', maxWidth: 420, width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,.08)', border: '1px solid #e8edf2',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'rgba(0,215,255,0.08)', border: '2px solid rgba(0,215,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { margin: '0 0 10px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  sub:   { margin: 0, fontSize: 15, color: '#64748b', lineHeight: 1.6 },
  field: { display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', width: '100%' },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', letterSpacing: '0.03em' },
  inputWrap: (isFocused, hasError = false) => ({
    display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
    borderRadius: 14,
    border: `1px solid ${hasError ? '#ef4444' : (isFocused ? CYAN : 'rgba(148,163,184,0.26)')}`,
    background: isFocused ? 'rgba(255,255,255,0.98)' : 'rgba(248,250,252,0.96)',
    boxShadow: hasError
      ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
      : (isFocused ? `0 0 0 3px ${CYAN_SOFT}, 0 0 18px rgba(31,182,207,0.12)` : 'none'),
    transition: 'all 0.18s ease',
  }),
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#0f172a', fontSize: 14, fontFamily: 'inherit' },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' },
  fieldError: { marginTop: 4, fontSize: 12, color: '#dc2626' },
  primaryBtn: {
    marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 52, border: 'none', borderRadius: 14, background: CYAN,
    color: '#021418', fontSize: 15, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(31, 182, 207, 0.18)',
  },
  btn: {
    display: 'inline-block', background: CYAN, color: '#021418', fontWeight: 700,
    fontSize: 14, padding: '12px 28px', borderRadius: 12, textDecoration: 'none', marginTop: 16,
  },
};
