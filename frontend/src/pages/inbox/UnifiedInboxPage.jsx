/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox, Search, Star, Archive, ArchiveRestore, CheckCircle2, Send,
  MessageSquare, AtSign, MessageCircle, Loader2,
  Smile, Frown, Meh, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import AIReplySuggestions from '../../components/ai/AIReplySuggestions';
import WorkspaceChannelToolbar from '../../components/analytics/WorkspaceChannelToolbar';
import { useConversations, useConversation } from '../../hooks/useInbox';
import { useDateRange, useOAuthStatus } from '../../hooks/useData';
import { inboxAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import useWorkspace from '../../hooks/useWorkspace';
import { getPlatformMeta, OAUTH_PLATFORM_IDS } from '../../constants/socialPlatforms';
import {
  INBOX_CONVERSATION_TYPES,
  INBOX_DEFAULT_RANGE_DAYS,
  INBOX_SENTIMENT_FILTERS,
} from '../../config/inbox';
import { clientSettingsPath } from '../../utils/workspacePaths';

const TYPE_ICONS = {
  '': Inbox,
  comment: MessageSquare,
  dm: MessageCircle,
  mention: AtSign,
  review: Star,
};

const SENTIMENT_ICONS = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const SENTIMENT_COLORS = {
  positive: 'var(--success)',
  neutral: 'var(--text-tertiary)',
  negative: 'var(--danger)',
};

export default function UnifiedInboxPage() {
  const { user } = useAuth();
  const { workspaceId, workspace, isAllWorkspaces } = useWorkspace({ user, autoHydrate: true });
  const clientId = isAllWorkspaces ? null : workspaceId;

  const [type, setType] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [range, setRange] = useDateRange(INBOX_DEFAULT_RANGE_DAYS);
  const { status: oauthStatus } = useOAuthStatus(clientId);
  const connectedPlatforms = useMemo(
    () => Object.entries(oauthStatus || {})
      .filter(([, v]) => v?.status === 'active')
      .map(([k]) => k),
    [oauthStatus],
  );

  const params = useMemo(() => {
    const p = {
      since: range.since,
      until: range.until,
    };
    if (type) p.type = type;
    if (sentiment) p.sentiment = sentiment;
    if (unreadOnly) p.unread = 1;
    if (starredOnly) p.starred = 1;
    if (search) p.search = search;
    if (channels.length) p.platforms = channels.join(',');
    return p;
  }, [type, sentiment, unreadOnly, starredOnly, search, channels, range.since, range.until]);

  const { data: conversations, refetch: refetchList, loading } = useConversations(params);
  const { data: thread, refetch: refetchThread } = useConversation(activeId);

  const settingsConnectPath = clientId ? clientSettingsPath('/admin', workspace) : null;
  const channelFallback = connectedPlatforms.length ? connectedPlatforms : OAUTH_PLATFORM_IDS;

  useEffect(() => {
    setActiveId(null);
  }, [clientId, range.since, range.until, channels.join(',')]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (activeId) {
      const convo = conversations.find((c) => c.id === activeId);
      if (convo && convo.unread_count > 0) {
        inboxAPI.conversations.markRead(activeId).then(() => refetchList()).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleSync = async () => {
    if (!clientId) {
      toast.error('Select a workspace to sync inbox.');
      return;
    }
    setSyncing(true);
    try {
      const platforms = channels.length ? channels : null;
      const res = await inboxAPI.sync(platforms);
      const queued = res.data?.queued || [];
      if (queued.length) {
        toast.success(`Inbox sync queued: ${queued.join(', ')}`);
      } else {
        toast.error('No active credentials — connect accounts first.');
      }
      setTimeout(() => {
        refetchList();
        if (activeId) refetchThread();
        setSyncing(false);
      }, 2500);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Inbox sync failed');
      setSyncing(false);
    }
  };

  return (
    <div style={{ paddingBottom: 0 }}>
      <PageHeader
        title="Inbox"
        subtitle="Comments, DMs, mentions, and reviews from the database for the selected workspace and date range"
      />

      <WorkspaceChannelToolbar
        clientId={clientId}
        workspaceLabel={workspace?.label || ''}
        currentUser={user}
        channels={channels}
        onChannelsChange={setChannels}
        fallbackPlatforms={channelFallback}
        range={range}
        onRangeChange={setRange}
        onSync={handleSync}
        syncing={syncing}
        syncDisabled={isAllWorkspaces}
        syncLabel="Sync inbox"
        syncTitle="Pull comments, DMs, and reviews from social APIs into the database"
        style={{ padding: '0 24px 12px' }}
      />

      {isAllWorkspaces && (
        <p style={{ padding: '0 24px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Select a single workspace in the top bar to view and sync inbox threads.
        </p>
      )}

      {!isAllWorkspaces && clientId && connectedPlatforms.length === 0 && (
        <p style={{ padding: '0 24px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
          No channels connected —{' '}
          {settingsConnectPath ? (
            <Link to={settingsConnectPath} style={{ color: 'var(--brand-primary-hover)', fontWeight: 600 }}>
              Connect accounts
            </Link>
          ) : (
            'connect accounts in workspace settings'
          )}
          , then use <strong>Sync inbox</strong>.
        </p>
      )}

      <div className="inbox-grid" style={{
        display: 'grid',
        gridTemplateColumns: '240px 340px minmax(0, 1fr)',
        gap: 0,
        padding: '0 24px',
        height: 'calc(100vh - 160px)',
      }}>
        {/* ── LEFT: filters ─────────────────────────────────────────── */}
        <FiltersColumn
          type={type} setType={setType}
          sentiment={sentiment} setSentiment={setSentiment}
          unreadOnly={unreadOnly} setUnreadOnly={setUnreadOnly}
          starredOnly={starredOnly} setStarredOnly={setStarredOnly}
          search={search} setSearch={setSearch}
        />

        {/* ── MIDDLE: conversation list ─────────────────────────────── */}
        <ListColumn
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          loading={loading}
        />

        {/* ── RIGHT: thread ─────────────────────────────────────────── */}
        <ThreadColumn
          thread={thread}
          onAction={() => { refetchList(); refetchThread(); }}
        />
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .inbox-grid { grid-template-columns: 1fr !important; height: auto !important; }
          .inbox-grid > div { display: none; }
          .inbox-grid > div:nth-child(2) { display: flex !important; height: 60vh; }
        }
      `}</style>
    </div>
  );
}

/* ── FILTERS COLUMN ────────────────────────────────────────────────────── */
function FiltersColumn({
  type, setType, sentiment, setSentiment,
  unreadOnly, setUnreadOnly, starredOnly, setStarredOnly, search, setSearch,
}) {
  return (
    <Card padding="none" style={{
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRight: 'none', borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
    }}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-tertiary)"
                  style={{ position: 'absolute', top: 11, left: 10 }} />
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', height: 36,
              padding: '0 10px 0 30px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
              color: 'var(--text-primary)',
              minHeight: 'unset',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <SectionHeader>Type</SectionHeader>
        {INBOX_CONVERSATION_TYPES.map((f) => (
          <FilterRow key={f.id || 'all'} icon={TYPE_ICONS[f.id] || Inbox} label={f.label}
                     active={type === f.id} onClick={() => setType(f.id)} />
        ))}

        <SectionHeader>Sentiment</SectionHeader>
        {INBOX_SENTIMENT_FILTERS.map((s) => (
          <FilterRow key={s.id || 'all'} icon={SENTIMENT_ICONS[s.id]} label={s.label}
                     iconColor={SENTIMENT_COLORS[s.id]}
                     active={sentiment === s.id} onClick={() => setSentiment(s.id)} />
        ))}

        <SectionHeader>Quick</SectionHeader>
        <FilterRow icon={Inbox} label="Unread only"
                    active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} />
        <FilterRow icon={Star} label="Starred only"
                    active={starredOnly} onClick={() => setStarredOnly((v) => !v)} />
      </div>
    </Card>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      padding: '12px 12px 6px',
      fontSize: 11, fontWeight: 600,
      color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6,
    }}>
      {children}
    </div>
  );
}

function FilterRow({ icon: Icon, label, active, onClick, iconColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 12px',
        background: active ? 'var(--brand-primary-glow)' : 'transparent',
        border: 'none', borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: 'pointer', textAlign: 'left',
        minHeight: 'unset', minWidth: 'unset',
        transition: 'var(--transition-fast)',
      }}
    >
      {Icon && <Icon size={14} color={iconColor || (active ? 'var(--text-primary)' : 'var(--text-tertiary)')} />}
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

/* ── LIST COLUMN ───────────────────────────────────────────────────────── */
function ListColumn({ conversations, activeId, onSelect, loading }) {
  return (
    <Card padding="none" style={{
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: 0, borderLeft: 'none', borderRight: 'none',
    }}>
      <div style={{
        padding: 14, borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)',
                       textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Loader2 size={18} className="ds-spin" color="var(--text-tertiary)" />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <EmptyState icon={Inbox} title="Inbox zero"
                       description="You're all caught up. New comments and messages will appear here as they arrive." />
        )}
        {conversations.map((c) => (
          <ConversationRow
            key={c.id}
            conv={c}
            active={c.id === activeId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
      <style>{`.ds-spin { animation: ds-spin 0.9s linear infinite; } @keyframes ds-spin { to { transform: rotate(360deg); } }`}</style>
    </Card>
  );
}

function ConversationRow({ conv, active, onClick }) {
  const meta = getPlatformMeta(conv.platform) || {};
  const platformColor = meta.color || 'var(--text-tertiary)';
  const platformLabel = meta.shortLabel || meta.label || conv.platform || '?';
  const SentIcon = SENTIMENT_ICONS[conv.sentiment];
  const sentColor = SENTIMENT_COLORS[conv.sentiment] || 'var(--text-tertiary)';
  const initial = (conv.contact_name || conv.contact_handle || '?')[0].toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', padding: '12px 14px',
        background: active ? 'var(--brand-primary-glow)' : 'transparent',
        border: 'none', borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer', textAlign: 'left',
        minHeight: 'unset', minWidth: 'unset',
        transition: 'var(--transition-fast)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 999,
          background: `linear-gradient(135deg, ${platformColor}, ${shade(platformColor, -15)})`,
          color: '#fff', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initial}
        </div>
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: 999,
          background: 'var(--surface-card)', border: '2px solid var(--surface-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color: platformColor,
        }}>
          {String(platformLabel).slice(0, 2)}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flex: 1,
          }}>
            {conv.contact_name || conv.contact_handle || 'Unknown'}
          </span>
          {conv.is_starred && <Star size={11} color="var(--warning)" fill="var(--warning)" />}
          {conv.unread_count > 0 && (
            <span style={{
              minWidth: 18, height: 18, padding: '0 5px',
              background: 'var(--brand-primary-hover)', color: '#fff',
              borderRadius: 999, fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {conv.unread_count}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {conv.last_message_preview || ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {SentIcon && <SentIcon size={11} color={sentColor} />}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {fmtTime(conv.last_message_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── THREAD COLUMN ─────────────────────────────────────────────────────── */
function ThreadColumn({ thread, onAction }) {
  const { user } = useAuth();
  const scrollRef = useRef();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Auto-scroll to the bottom on thread change
  useEffect(() => {
    if (scrollRef.current && thread?.messages?.length) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.id, thread?.messages?.length]);

  if (!thread) {
    return (
      <Card padding="none" style={{
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', borderLeft: 'none',
      }}>
        <EmptyState icon={MessageSquare} title="Select a conversation"
                     description="Pick a conversation from the list to read it and reply." />
      </Card>
    );
  }

  const meta = getPlatformMeta(thread.platform) || {};
  const platformColor = meta.color || 'var(--text-tertiary)';
  const platformLabel = meta.label || thread.platform;

  async function send() {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      await inboxAPI.conversations.reply(thread.id, text);
      setReplyText('');
      onAction?.();
      toast.success('Reply sent');
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'token_expired') {
        toast.error(`${thread.platform} token expired — please reconnect.`);
      } else {
        toast.error(e.response?.data?.detail || 'Reply failed');
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleStar() {
    if (thread.is_starred) await inboxAPI.conversations.unstar(thread.id);
    else                    await inboxAPI.conversations.star(thread.id);
    onAction?.();
  }
  async function toggleArchive() {
    if (thread.is_archived) await inboxAPI.conversations.unarchive(thread.id);
    else                     await inboxAPI.conversations.archive(thread.id);
    onAction?.();
  }
  async function toggleResolve() {
    if (thread.is_resolved) await inboxAPI.conversations.reopen(thread.id);
    else                     await inboxAPI.conversations.resolve(thread.id);
    onAction?.();
  }

  // Last inbound message — used to show AI suggested reply if available
  const lastInbound = (thread.messages || [])
    .filter((m) => m.direction === 'inbound')
    .slice(-1)[0];

  return (
    <Card padding="none" style={{
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', borderLeft: 'none',
    }}>
      {/* Thread header */}
      <div style={{
        padding: 14, borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 999,
          background: `linear-gradient(135deg, ${platformColor}, ${shade(platformColor, -15)})`,
          color: '#fff', fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {(thread.contact_name || thread.contact_handle || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {thread.contact_name || thread.contact_handle || 'Unknown'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            <span style={{ color: platformColor, fontWeight: 600 }}>{platformLabel}</span>
            <span>·</span>
            <span>{thread.type}</span>
            {thread.contact_handle && (
              <>
                <span>·</span>
                <span>@{thread.contact_handle}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <ActionIcon icon={Star} active={thread.is_starred}
                      onClick={toggleStar} ariaLabel="Star" />
          <ActionIcon icon={thread.is_archived ? ArchiveRestore : Archive}
                      active={thread.is_archived}
                      onClick={toggleArchive} ariaLabel="Archive" />
          <ActionIcon icon={CheckCircle2} active={thread.is_resolved}
                      onClick={toggleResolve} ariaLabel="Resolve" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: 16,
        background: 'var(--surface-sunken)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {(thread.messages || []).map((m) => <Bubble key={m.id} msg={m} />)}
      </div>

      {/* Reply box */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
        {/* Social Stats — 3 reply variants for the latest inbound message */}
        {lastInbound && !thread.is_resolved && (
          <AIReplySuggestions
            clientId={user?.client_id || thread.client}
            messageId={lastInbound.id}
            platform={thread.platform}
            senderName={thread.contact_name || ''}
            onPick={(text) => setReplyText(text)}
            autoLoad={false}
          />
        )}
        {lastInbound?.ai_suggested_reply && (
          <button
            type="button"
            onClick={() => setReplyText(lastInbound.ai_suggested_reply)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px',
              background: 'var(--brand-primary-glow)',
              color: 'var(--brand-primary-hover)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer', marginBottom: 8,
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <Sparkles size={11} />
            AI suggests: {lastInbound.ai_suggested_reply.slice(0, 60)}…
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
            placeholder={thread.is_resolved ? 'Conversation resolved — reopen to reply' : 'Type a reply… (⌘↵ to send)'}
            disabled={thread.is_resolved}
            rows={2}
            style={{
              flex: 1, resize: 'vertical',
              padding: '10px 12px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, fontFamily: 'inherit',
              color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box',
              minHeight: 'unset',
            }}
          />
          <Button
            icon={Send}
            onClick={send}
            loading={sending}
            disabled={!replyText.trim() || thread.is_resolved}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ActionIcon({ icon: Icon, active, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--brand-primary-glow)' : 'transparent',
        color: active ? 'var(--brand-primary-hover)' : 'var(--text-tertiary)',
        border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'unset', minWidth: 'unset',
        transition: 'var(--transition-fast)',
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function Bubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  const SentIcon = SENTIMENT_ICONS[msg.sentiment];
  const sentColor = SENTIMENT_COLORS[msg.sentiment] || 'var(--text-tertiary)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isOut ? 'flex-end' : 'flex-start',
      gap: 2,
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: 16,
        background: isOut
          ? 'linear-gradient(135deg, #00CCF5, #00A8D8)'
          : 'var(--surface-card)',
        color: isOut ? '#fff' : 'var(--text-primary)',
        fontSize: 13, lineHeight: 1.5,
        boxShadow: isOut ? '0 2px 6px rgba(0,168,216,0.15)' : 'var(--shadow-sm)',
        border: isOut ? 'none' : '1px solid var(--border-subtle)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {!isOut && msg.author_name && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {msg.author_name}
          </div>
        )}
        {msg.content || <em style={{ opacity: 0.7 }}>[no content]</em>}
      </div>
      <div style={{
        display: 'flex', gap: 6, alignItems: 'center',
        fontSize: 10, color: 'var(--text-tertiary)',
        padding: '0 6px',
      }}>
        <span>{fmtDateTime(msg.sent_at || msg.created_at)}</span>
        {!isOut && SentIcon && (
          <>
            <span>·</span>
            <SentIcon size={10} color={sentColor} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── helpers ───────────────────────────────────────────────────────────── */
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'now';
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return d.toLocaleDateString();
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shade(hex, pct) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let n = parseInt(m[1], 16);
  let r = (n >> 16) + Math.round(255 * pct / 100);
  let g = ((n >> 8) & 0xff) + Math.round(255 * pct / 100);
  let b = (n & 0xff) + Math.round(255 * pct / 100);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
