import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useData';
import { adminAPI, invitationAPI } from '../services/api';
import { Plus, Search, ChevronRight, Settings, Mail, X, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

export default function AllClientsPage({ onSelectClient }) {
  const navigate               = useNavigate();
  const { clients, refetch }   = useClients();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]        = useState({ company:'', name:'', email:'', password:'' });
  const [errors, setErrors]    = useState({});
  const [creating, setCreating]= useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [search, setSearch]    = useState('');

  // Invite client
  const [showInvite, setShowInvite]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg]     = useState('');
  const [inviting, setInviting]       = useState(false);
  const [inviteResult, setInviteResult] = useState('');

  // Pending invitations list
  const [invitations, setInvitations]       = useState([]);
  const [showInvList, setShowInvList]       = useState(false);
  const [loadingInvList, setLoadingInvList] = useState(false);
  const [cancelingId, setCancelingId]       = useState(null);

  const fetchInvitations = useCallback(async () => {
    setLoadingInvList(true);
    try {
      const res = await invitationAPI.mine();
      setInvitations(res.data);
    } catch { /* ignore */ }
    finally { setLoadingInvList(false); }
  }, []);

  useEffect(() => {
    if (showInvList) fetchInvitations();
  }, [showInvList, fetchInvitations]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteResult('');
    try {
      await invitationAPI.send({ client_email: inviteEmail.trim().toLowerCase(), message: inviteMsg.trim() });
      setInviteResult('success');
      setInviteEmail(''); setInviteMsg('');
      fetchInvitations();
    } catch (err) {
      setInviteResult('error:' + (err?.response?.data?.error || 'Failed to send invitation.'));
    } finally { setInviting(false); }
  };

  const handleCancelInv = async (id) => {
    setCancelingId(id);
    try {
      await invitationAPI.cancel(id);
      fetchInvitations();
    } catch { /* ignore */ }
    finally { setCancelingId(null); }
  };

  const statusColor = { pending:'#f59e0b', accepted:'#16a34a', rejected:'#dc2626', expired:'#94a3b8', cancelled:'#94a3b8' };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.company?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateCreateForm = () => {
    const nextErrors = {};
    if (!form.company.trim()) nextErrors.company = 'Company name is required.';
    if (!form.name.trim()) nextErrors.name = 'Contact name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!form.password.trim()) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      setCreateMsg('❌ Please fix the highlighted fields.');
      return;
    }
    setCreating(true); setCreateMsg('');
    try {
      await adminAPI.createClient(form);
      setCreateMsg('✅ User created! They can now log in.');
      setForm({ company:'', name:'', email:'', password:'' });
      setErrors({});
      refetch();
    } catch (err) {
      setCreateMsg('❌ ' + (err.response?.data?.error || 'Error creating user'));
    } finally { setCreating(false); }
  };

  return (
    <div style={styles.page}>
      <PageHeader
        title="All Users"
        subtitle={`${filtered.length} of ${clients.length} user${clients.length !== 1 ? 's' : ''}`}
        actions={(
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setShowInvite(s => !s); setInviteResult(''); }} style={styles.inviteBtn}>
              <span style={styles.btnInner}><Mail size={15} /> Invite Client</span>
            </button>
            <button onClick={() => setShowCreate(s => !s)} style={styles.addBtn}>
              <span style={styles.btnInner}><Plus size={16} /> Add New User</span>
            </button>
          </div>
        )}
      />

      {/* Invite Client modal */}
      {showInvite && (
        <div style={styles.inviteBox}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={styles.inviteTitle}>Invite a Client</h3>
            <button onClick={() => setShowInvite(false)} style={styles.closeBtn}><X size={16} /></button>
          </div>
          {inviteResult === 'success' ? (
            <div style={styles.successMsg}>✅ Invitation sent! The client will receive an email with the invite link.</div>
          ) : (
            <form onSubmit={handleInvite} style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              <div style={{ flex:'1 1 220px' }}>
                <label style={styles.label}>Client Email <span style={styles.req}>*</span></label>
                <input
                  type="email" required placeholder="client@example.com"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <div style={{ flex:'2 1 280px' }}>
                <label style={styles.label}>Personal Message (optional)</label>
                <input
                  placeholder="We'd love to manage your social analytics…"
                  value={inviteMsg} onChange={e => setInviteMsg(e.target.value)}
                  style={styles.formInput}
                />
              </div>
              <button type="submit" disabled={inviting} style={{ ...styles.createBtn, alignSelf:'flex-end' }}>
                {inviting ? <><Loader2 size={13} style={{ animation:'spin .8s linear infinite' }} /> Sending…</> : 'Send Invite'}
              </button>
              {inviteResult.startsWith('error:') && (
                <div style={{ ...styles.errorMsg, width:'100%' }}>{inviteResult.slice(6)}</div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Pending Invitations panel */}
      <div style={styles.invListBox}>
        <button style={styles.invListToggle} onClick={() => setShowInvList(s => !s)}>
          <span style={styles.btnInner}><Mail size={14} /> Sent Invitations</span>
          {showInvList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showInvList && (
          <div style={{ marginTop:12 }}>
            {loadingInvList ? (
              <div style={{ display:'flex', justifyContent:'center', padding:16 }}>
                <Loader2 size={18} style={{ animation:'spin .8s linear infinite', color:'#94a3b8' }} />
              </div>
            ) : invitations.length === 0 ? (
              <p style={{ color:'#94a3b8', fontSize:13, margin:0 }}>No invitations sent yet.</p>
            ) : (
              <table style={{ ...styles.table, fontSize:12 }}>
                <thead>
                  <tr>
                    {['Email','Status','Sent','Message','Action'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map(inv => (
                    <tr key={inv.id} style={styles.tr}>
                      <td style={styles.td}>{inv.client_email}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, color: statusColor[inv.status] || '#64748b', background: (statusColor[inv.status] || '#64748b') + '18' }}>
                          {inv.status === 'pending' && !inv.is_expired ? '● Pending' : inv.status === 'accepted' ? '✓ Accepted' : inv.status === 'rejected' ? '✕ Rejected' : '— ' + inv.status}
                        </span>
                      </td>
                      <td style={styles.td}>{inv.invited_at ? new Date(inv.invited_at).toLocaleDateString() : '—'}</td>
                      <td style={styles.td}>{inv.message || '—'}</td>
                      <td style={styles.td}>
                        {inv.status === 'pending' && !inv.is_expired ? (
                          <button
                            style={styles.cancelInvBtn}
                            disabled={cancelingId === inv.id}
                            onClick={() => handleCancelInv(inv.id)}
                          >
                            {cancelingId === inv.id ? <Loader2 size={11} style={{ animation:'spin .8s linear infinite' }} /> : <X size={11} />}
                            Cancel
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showCreate && (
        <div style={styles.createBox}>
          <h3 style={styles.createTitle}>Create User Account</h3>
          <form onSubmit={handleCreate} style={styles.createForm}>
            <div style={styles.field}>
              <label style={styles.label}>Company Name <span style={styles.requiredAsterisk}>*</span></label>
              <input
                placeholder="Acme Corp"
                value={form.company}
                onChange={e => handleFieldChange('company', e.target.value)}
                style={{ ...styles.formInput, ...(errors.company ? styles.inputError : {}) }}
              />
              {errors.company && <div style={styles.errorText}>{errors.company}</div>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact Name <span style={styles.requiredAsterisk}>*</span></label>
              <input
                placeholder="John Smith"
                value={form.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                style={{ ...styles.formInput, ...(errors.name ? styles.inputError : {}) }}
              />
              {errors.name && <div style={styles.errorText}>{errors.name}</div>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email <span style={styles.requiredAsterisk}>*</span></label>
              <input
                placeholder="john@acme.com"
                type="email"
                value={form.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                style={{ ...styles.formInput, ...(errors.email ? styles.inputError : {}) }}
              />
              {errors.email && <div style={styles.errorText}>{errors.email}</div>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password <span style={styles.requiredAsterisk}>*</span></label>
              <input
                placeholder="Create a password"
                type="password"
                value={form.password}
                onChange={e => handleFieldChange('password', e.target.value)}
                style={{ ...styles.formInput, ...(errors.password ? styles.inputError : {}) }}
              />
              {errors.password && <div style={styles.errorText}>{errors.password}</div>}
            </div>
            <button type="submit" disabled={creating} style={styles.createBtn}>
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </form>
          {createMsg && <div style={createMsg.startsWith('✅') ? styles.successMsg : styles.errorMsg}>{createMsg}</div>}
        </div>
      )}

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <Search size={15} style={styles.searchIcon} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company, name or email…"
            style={styles.searchInput}
          />
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Company','Contact','Email','Website','Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={styles.empty}>
                {clients.length === 0 ? 'No users yet. Add your first user above.' : 'No users match your search.'}
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{c.company}</td>
                <td style={styles.td}>{c.name}</td>
                <td style={styles.td}>{c.email}</td>
                <td style={styles.td}>
                  {c.website
                    ? <a href={c.website} target="_blank" rel="noreferrer" style={styles.link}>{c.website}</a>
                    : '—'}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => { onSelectClient?.(c); navigate(`/admin/client/${c.id}`); }}
                      style={styles.viewBtn}
                    >
                      <span style={styles.btnInner}>Dashboard <ChevronRight size={13} /></span>
                    </button>
                    <button
                      onClick={() => { onSelectClient?.(c); navigate(`/admin/client/${c.id}/settings`); }}
                      style={styles.iconBtn}
                    >
                      <span style={styles.btnInner}><Settings size={13} /> Account</span>
                    </button>
                    {/* <button
                      onClick={() => { onSelectClient?.(c); navigate(`/admin/client/${c.id}/edit`); }}
                      style={styles.iconBtn}
                    >
                      <span style={styles.btnInner}><Pencil size={13} /> Edit</span>
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page:     { padding: '28px 32px', maxWidth: 1400, margin: '0 auto' },
  addBtn: {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: '#00d7ff', color: '#0f172a', cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
  inviteBtn: {
    padding: '10px 20px', borderRadius: 10, border: '1.5px solid #7c3aed',
    background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
  inviteBox: {
    background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 14,
    padding: 20, marginBottom: 20,
  },
  inviteTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: '#7c3aed' },
  closeBtn: { background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center' },
  req: { color:'#ef4444', marginLeft:2 },
  invListBox: {
    background: '#fff', border: '1px solid #e8edf2', borderRadius: 12,
    padding: '14px 20px', marginBottom: 20,
  },
  invListToggle: {
    display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569',
  },
  statusBadge: {
    display:'inline-block', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:600,
  },
  cancelInvBtn: {
    display:'flex', alignItems:'center', gap:4,
    background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5',
    borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer',
  },
  btnInner: { display: 'flex', alignItems: 'center', gap: 6 },
  createBox: {
    background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 14,
    padding: 24, marginBottom: 24,
  },
  createTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0369a1' },
  createForm:  { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' },
  field: { flex: '1 1 220px', minWidth: 0 },
  label: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' },
  requiredAsterisk: { color: '#ef4444', marginLeft: 2, fontWeight: 800 },
  formInput: {
    flex: '1 1 180px', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  inputError: { borderColor: '#ef4444', background: '#fef2f2' },
  errorText: { marginTop: 6, fontSize: 12, color: '#dc2626' },
  createBtn: {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    background: '#0369a1', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, alignSelf: 'flex-start',
  },
  successMsg: { marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontSize: 13 },
  errorMsg: { marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13 },
  filterBar: { marginBottom: 16 },
  searchWrapper: {
    position: 'relative', display: 'inline-flex', alignItems: 'center',
    width: '100%', maxWidth: 360,
  },
  searchIcon: {
    position: 'absolute', left: 10, color: '#94a3b8', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', padding: '9px 14px 9px 32px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
  tableWrap: {
    background: '#fff', borderRadius: 14, padding: 24,
    boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflowX: 'auto',
  },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left', padding: '10px 12px', background: '#f0f4f9',
    color: '#64748b', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  tr:   { borderBottom: '1px solid #f1f5f9' },
  td:   { padding: '12px 12px', color: '#374151' },
  empty:{ padding: '40px 12px', textAlign: 'center', color: '#94a3b8' },
  link: { color: '#00d7ff', textDecoration: 'none' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  viewBtn: {
    padding: '6px 14px', borderRadius: 8, border: '1.5px solid #00d7ff',
    background: 'transparent', color: '#00d7ff', cursor: 'pointer', fontWeight: 600, fontSize: 12,
  },
  iconBtn: {
    padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 12,
  },
};
