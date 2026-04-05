/**
 * NotificationBell — merged Alerts + Notifications in one dropdown.
 * Two tabs: Alerts (from useAlerts) and Notifications (from notificationAPI).
 * Badge shows total unread across both.
 * Notifications tab handles inline Accept/Reject for invitation_received.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, X,
  AlertCircle, TrendingDown, Zap, Target, Users,
  Building2, CheckCircle, XCircle, Info, Loader2,
} from 'lucide-react';
import { useAlerts } from '../../hooks/useData';
import { notificationAPI, invitationAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatTimeAgo } from '../../services/formatters';

const CYAN = '#00d7ff';

const ALERT_ICONS = {
  token_expired:      { icon: AlertCircle,  color: '#dc2626' },
  sync_failed:        { icon: AlertCircle,  color: '#ea580c' },
  reach_drop:         { icon: TrendingDown, color: '#d97706' },
  viral_post:         { icon: Zap,          color: '#7c3aed' },
  goal_at_risk:       { icon: Target,       color: '#c2410c' },
  follower_milestone: { icon: Users,        color: '#16a34a' },
};

const NOTIF_ICONS = {
  invitation_received:  { icon: Building2,   color: '#7c3aed' },
  invitation_accepted:  { icon: CheckCircle, color: '#16a34a' },
  invitation_rejected:  { icon: XCircle,     color: '#dc2626' },
  invitation_cancelled: { icon: XCircle,     color: '#94a3b8' },
  system:               { icon: Info,        color: '#3b82f6' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ clientId }) {
  const { refreshAuth } = useAuth();
  const navigate        = useNavigate();
  const dropRef         = useRef(null);
  const btnRef          = useRef(null);

  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState('alerts'); // 'alerts' | 'notifs'
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const { alerts, unreadCount: alertUnread, markRead: markAlertRead, markAllRead: markAllAlerts } = useAlerts(clientId);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifs, setNotifs]         = useState([]);
  const [responding, setResponding] = useState(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await notificationAPI.list();
      setNotifs(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  const notifUnread  = notifs.filter(n => !n.is_read).length;
  const totalUnread  = alertUnread + notifUnread;

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      const inBtn  = btnRef.current  && btnRef.current.contains(e.target);
      const inDrop = dropRef.current && dropRef.current.contains(e.target);
      if (!inBtn && !inDrop) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // ── Notification actions ─────────────────────────────────────────────────────
  const markNotifRead = async (id) => {
    await notificationAPI.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllNotifs = async () => {
    await notificationAPI.markAll();
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleRespond = async (notif, action) => {
    const token = notif.data?.token;
    if (!token) return;
    setResponding(notif.id + action);
    try {
      const res = await invitationAPI.respond(token, action);
      if (action === 'accept') {
        await refreshAuth(res.data.access, res.data.refresh);
        setOpen(false);
        navigate('/dashboard', { replace: true });
      }
      markNotifRead(notif.id);
      fetchNotifs();
    } catch { /* ignore */ }
    finally { setResponding(null); }
  };

  const recentAlerts = alerts.slice(0, 20);
  const recentNotifs = notifs.slice(0, 20);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={dropRef} style={s.wrap}>
      <button ref={btnRef} onClick={handleToggle} style={s.btn} title="Notifications & Alerts">
        <Bell size={20} />
        {totalUnread > 0 && (
          <span style={s.badge}>{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

      {open && (
        <div style={{ ...s.dropdown, position: 'fixed', top: dropPos.top, right: dropPos.right, left: 'auto' }}>
          {/* Header */}
          <div style={s.dropHead}>
            <span style={s.dropTitle}>Notifications</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {tab === 'alerts' && alertUnread > 0 && (
                <button onClick={markAllAlerts} style={s.iconBtn} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              {tab === 'notifs' && notifUnread > 0 && (
                <button onClick={markAllNotifs} style={s.iconBtn} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} style={s.iconBtn}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={s.tabs}>
            <button
              style={{ ...s.tabBtn, ...(tab === 'alerts' ? s.tabActive : {}) }}
              onClick={() => setTab('alerts')}
            >
              Alerts
              {alertUnread > 0 && <span style={s.tabBadge}>{alertUnread}</span>}
            </button>
            <button
              style={{ ...s.tabBtn, ...(tab === 'notifs' ? s.tabActive : {}) }}
              onClick={() => setTab('notifs')}
            >
              Notifications
              {notifUnread > 0 && <span style={s.tabBadge}>{notifUnread}</span>}
            </button>
          </div>

          {/* Content */}
          <div style={s.list}>
            {tab === 'alerts' && (
              recentAlerts.length === 0
                ? <div style={s.empty}>No alerts yet.</div>
                : recentAlerts.map(alert => {
                    const cfg  = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.sync_failed;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={alert.id}
                        style={{ ...s.item, background: alert.is_read ? '#fff' : '#f0f4ff' }}
                        onClick={() => !alert.is_read && markAlertRead(alert.id)}
                      >
                        <div style={{ ...s.iconWrap, background: cfg.color + '20' }}>
                          <Icon size={14} style={{ color: cfg.color }} />
                        </div>
                        <div style={s.itemBody}>
                          <div style={s.itemMsg}>{alert.message}</div>
                          <div style={s.itemMeta}>
                            {alert.client_name && (
                              <span style={s.clientTag}>{alert.client_name}</span>
                            )}
                            <span style={s.time}>{formatTimeAgo(alert.created_at, { includeSeconds: false })}</span>
                          </div>
                        </div>
                        {!alert.is_read && <div style={s.dot} />}
                      </div>
                    );
                  })
            )}

            {tab === 'notifs' && (
              recentNotifs.length === 0
                ? <div style={s.empty}>No notifications yet.</div>
                : recentNotifs.map(n => {
                    const cfg  = NOTIF_ICONS[n.notif_type] || NOTIF_ICONS.system;
                    const Icon = cfg.icon;
                    const isInvite = n.notif_type === 'invitation_received';
                    return (
                      <div
                        key={n.id}
                        style={{ ...s.item, background: n.is_read ? '#fff' : '#f0f9ff' }}
                        onClick={() => !n.is_read && markNotifRead(n.id)}
                      >
                        <div style={{ ...s.iconWrap, background: cfg.color + '18' }}>
                          <Icon size={14} style={{ color: cfg.color }} />
                        </div>
                        <div style={s.itemBody}>
                          <div style={s.itemMsg}>{n.title}</div>
                          {n.body && <div style={{ ...s.itemMsg, color: '#64748b', fontSize: 12, marginBottom: 2 }}>{n.body}</div>}
                          <div style={s.itemMeta}>
                            <span style={s.time}>{timeAgo(n.created_at)}</span>
                          </div>
                          {isInvite && n.data?.token && !n.is_read && (
                            <div style={s.invActions}>
                              <button
                                style={s.acceptBtn}
                                disabled={!!responding}
                                onClick={e => { e.stopPropagation(); handleRespond(n, 'accept'); }}
                              >
                                {responding === n.id + 'accept'
                                  ? <Loader2 size={11} style={{ animation: 'spin .8s linear infinite' }} />
                                  : <CheckCircle size={11} />
                                }
                                Accept
                              </button>
                              <button
                                style={s.rejectBtn}
                                disabled={!!responding}
                                onClick={e => { e.stopPropagation(); handleRespond(n, 'reject'); }}
                              >
                                {responding === n.id + 'reject'
                                  ? <Loader2 size={11} style={{ animation: 'spin .8s linear infinite' }} />
                                  : <XCircle size={11} />
                                }
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                        {!n.is_read && <div style={{ ...s.dot, background: CYAN }} />}
                      </div>
                    );
                  })
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  wrap:  { position: 'relative' },
  btn: {
    position: 'relative', background: 'none', border: '1.5px solid #e5e7eb',
    borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', color: '#374151',
  },
  badge: {
    position: 'absolute', top: -6, right: -6,
    background: '#dc2626', color: '#fff', borderRadius: 20,
    fontSize: 10, fontWeight: 700, padding: '1px 5px', lineHeight: 1.4,
    minWidth: 18, textAlign: 'center',
  },
  dropdown: {
    width: 360, maxHeight: 520, background: '#fff',
    borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,.15)',
    border: '1px solid #e5e7eb', zIndex: 99999,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  dropHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9',
  },
  dropTitle: { fontWeight: 700, fontSize: 14, color: '#0f172a' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', padding: 4, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid #f1f5f9',
    padding: '0 12px',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 12px', fontSize: 12, fontWeight: 600,
    color: '#64748b', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    marginBottom: -1, transition: 'color .15s',
  },
  tabActive: {
    color: '#0f172a', borderBottomColor: CYAN,
  },
  tabBadge: {
    background: '#ef4444', color: '#fff',
    fontSize: 10, fontWeight: 700, borderRadius: 20,
    padding: '1px 5px', lineHeight: 1.4,
  },
  list:    { overflowY: 'auto', flex: 1 },
  empty:   { padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '1px solid #f8fafc', transition: 'background .15s',
  },
  iconWrap: {
    flexShrink: 0, width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemMsg:  { fontSize: 13, color: '#1e293b', lineHeight: 1.4, marginBottom: 4 },
  itemMeta: { display: 'flex', alignItems: 'center', gap: 6 },
  clientTag: {
    fontSize: 11, background: '#ede9fe', color: '#6d28d9',
    borderRadius: 20, padding: '1px 7px', fontWeight: 600,
  },
  time: { fontSize: 11, color: '#94a3b8' },
  dot: {
    flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
    background: '#6366f1', marginTop: 6,
  },
  invActions: { display: 'flex', gap: 6, marginTop: 6 },
  acceptBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#dcfce7', color: '#166534', border: '1px solid #86efac',
    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  rejectBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
};
