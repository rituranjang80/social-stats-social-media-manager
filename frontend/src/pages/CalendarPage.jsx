/* ============================================================================
 * Social Stats — Social Media Management & Marketing Platform
 * Author    : Chandrabhan Shekhawat
 * Company   : Gigai Kripa Services
 * Website   : https://gigaikripaservices.com/
 * Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 * Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import {
  lazy, Suspense, useCallback, useEffect, useMemo, useState,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalIcon, List, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import useWorkspace from '../hooks/useWorkspace';
import {
  useCalendarNotes,
  useCalendarPosts,
  useCalendarStats,
  useCreatePost,
  useUpcomingPosts,
} from '../hooks/useCalendar';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import CalendarStatistics from '../components/calendar/CalendarStatistics';
import FloatingCreateButton from '../components/calendar/FloatingCreateButton';
import PostDrawer from '../components/calendar/PostDrawer';
import PostFormDrawer from '../components/calendar/PostFormDrawer';
import UpcomingPosts from '../components/calendar/UpcomingPosts';
import {
  computeStatsFromPosts,
  composerUrl,
  extractPlatformsFromPosts,
  extractTagsFromPosts,
  filterPosts,
  flattenPosts,
  preserveTimeOnDate,
  shiftPeriod,
} from '../components/calendar/utils';
import { DEFAULT_COMPOSE_TIME } from '../components/calendar/constants';

import '../styles/scss/calendar.scss';

const MonthView = lazy(() => import('../components/calendar/CalendarMonthView'));
const WeekView = lazy(() => import('../components/calendar/WeekView'));
const DayView = lazy(() => import('../components/calendar/DayView'));
const AgendaView = lazy(() => import('../components/calendar/AgendaView'));
const CalendarStats = lazy(() => import('../components/calendar/CalendarStats'));

function ViewFallback() {
  return (
    <div className="bb-cal__loading">
      <Loader2 size={18} className="bb-cal__spin" />
      Loading view…
    </div>
  );
}

export default function CalendarPage({ clientId: propClientId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'staff';
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';

  const { workspaceId, workspace } = useWorkspace({ user, autoHydrate: true });
  const clientId = propClientId || workspaceId || user?.client_id || null;

  const queryView = searchParams.get('view');
  const queryMode = searchParams.get('mode');
  // Default: Calendar mode + Month view for the current month
  const initialView = ['month', 'week', 'day', 'agenda', 'stats', 'list'].includes(queryView)
    ? (queryView === 'list' ? 'agenda' : queryView)
    : 'month';
  const initialMode = queryMode === 'list' ? 'list' : 'calendar';

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState(initialView);
  const [mode, setMode] = useState(initialMode);
  const [status, setStatus] = useState('');
  const [channels, setChannels] = useState([]); // empty = All Channels
  const [tags, setTags] = useState([]); // empty = All Tags
  const [search, setSearch] = useState('');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const [detailPost, setDetailPost] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  // Fetch full month once; channel/tag filters apply client-side (All = no restriction)
  const { postsByDate, loading: postsLoading, refetch: refetchPosts } =
    useCalendarPosts(clientId, month, year);
  const { notesByDate } = useCalendarNotes(clientId, month, year);
  const { stats } = useCalendarStats(clientId, month, year);
  const { upcoming } = useUpcomingPosts(clientId);
  const { create, update, remove, reschedule } = useCreatePost();

  const updateSearch = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (['month', 'week', 'day', 'agenda', 'stats'].includes(queryView) && queryView !== view) {
      setView(queryView === 'list' ? 'agenda' : queryView);
    }
    if (queryMode === 'list' || queryMode === 'calendar') {
      setMode(queryMode);
    }
  }, [queryView, queryMode, view]);

  const filteredPosts = useMemo(
    () => filterPosts(postsByDate, { status, channels, tags, search }),
    [postsByDate, status, channels, tags, search],
  );

  const tagOptions = useMemo(
    () => extractTagsFromPosts(flattenPosts(postsByDate)),
    [postsByDate],
  );

  const fallbackPlatforms = useMemo(
    () => extractPlatformsFromPosts(flattenPosts(postsByDate)),
    [postsByDate],
  );

  const localCounts = useMemo(
    () => computeStatsFromPosts(filteredPosts),
    [filteredPosts],
  );

  function goComposer(dateStr, timeStr = DEFAULT_COMPOSE_TIME) {
    navigate(composerUrl(basePath, {
      date: dateStr,
      time: timeStr,
      workspaceId: clientId,
    }));
  }

  function openPostDetail(post) {
    if (post?.source === 'composer') {
      navigate(`${basePath}/analytics/composer/${post.id}`);
      return;
    }
    setDetailPost(post);
    setDetailOpen(true);
  }
  function closeDetail() {
    setDetailOpen(false);
    setTimeout(() => setDetailPost(null), 300);
  }

  function openFormForEdit(post) {
    if (!isAdmin) return;
    if (post?.source === 'composer') {
      navigate(`${basePath}/analytics/composer/${post.id}`);
      return;
    }
    setEditingPost(post);
    setFormDate(null);
    setFormOpen(true);
    setDetailOpen(false);
  }

  function closeForm() {
    setFormOpen(false);
    setTimeout(() => { setEditingPost(null); setFormDate(null); }, 300);
  }

  async function handleSavePost(data, postId) {
    let result;
    if (postId) {
      result = await update(postId, data);
    } else {
      if (!clientId) return { success: false, error: 'No workspace selected.' };
      result = await create({ ...data, client: clientId });
    }
    if (result.success) {
      closeForm();
      refetchPosts();
    }
    return result;
  }

  async function handleDeletePost(postOrId) {
    const post = typeof postOrId === 'object' ? postOrId : { id: postOrId, source: 'calendar' };
    const r = await remove(post.id, { source: post.source || 'calendar' });
    if (r.success) {
      closeDetail();
      refetchPosts();
      toast.success('Post deleted');
    } else {
      toast.error(r.error || 'Delete failed');
    }
  }

  async function handleReschedule(postId, datetime, source = 'calendar') {
    const r = await reschedule(postId, datetime, {
      source,
      clientId,
    });
    if (r.success) {
      setDetailPost(r.post);
      refetchPosts();
      toast.success('Rescheduled');
    } else {
      toast.error(r.error || 'Reschedule failed');
    }
    return r;
  }

  async function handleDropPost(postId, dateStr, timeStr, source = 'calendar') {
    const all = flattenPosts(postsByDate);
    const post = all.find((p) => String(p.id) === String(postId)
      && (p.source || 'calendar') === (source || 'calendar'));
    const resolved = post || all.find((p) => String(p.id) === String(postId));
    if (!resolved || resolved.status === 'published') {
      toast.error('Published posts cannot be moved');
      return;
    }
    const datetime = preserveTimeOnDate(dateStr, timeStr, resolved.scheduled_at);
    await handleReschedule(
      resolved.id,
      new Date(datetime).toISOString(),
      resolved.source || source || 'calendar',
    );
  }

  function handleDuplicate(post) {
    if (post?.source === 'composer') {
      navigate(`${basePath}/analytics/composer/${post.id}`);
      return;
    }
    // Legacy calendar posts: open form prefilled via edit clone path
    if (!isAdmin) return;
    setEditingPost({
      ...post,
      id: undefined,
      title: post.title ? `${post.title} (copy)` : 'Copy',
      status: 'draft',
    });
    setFormDate(null);
    setFormOpen(true);
  }

  const cardActions = {
    onOpen: openPostDetail,
    onEdit: isAdmin ? openFormForEdit : undefined,
    onDelete: isAdmin ? handleDeletePost : undefined,
    onDuplicate: isAdmin ? handleDuplicate : undefined,
    onPreview: openPostDetail,
    onAnalytics: () => navigate(`${basePath}/analytics`),
    onComposer: (post) => {
      if (post?.source === 'composer') {
        navigate(`${basePath}/analytics/composer/${post.id}`);
        return;
      }
      const d = post.scheduled_at
        ? format(new Date(post.scheduled_at), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      const t = post.scheduled_at
        ? format(new Date(post.scheduled_at), 'HH:mm')
        : DEFAULT_COMPOSE_TIME;
      goComposer(d, t);
    },
  };

  function setViewAndUrl(nextView) {
    setView(nextView);
    updateSearch({ view: nextView, mode: mode === 'list' ? 'list' : 'calendar' });
  }

  function setModeAndUrl(nextMode) {
    setMode(nextMode);
    if (nextMode === 'list') {
      setView('agenda');
      updateSearch({ mode: 'list', view: 'agenda' });
    } else {
      setView((v) => (v === 'agenda' ? 'month' : v));
      updateSearch({ mode: 'calendar', view: view === 'agenda' ? 'month' : view });
    }
  }

  if (!clientId) {
    return (
      <div className="bb-cal">
        <div className="bb-cal__shell">
          <div className="bb-cal__title-row">
            <h1 className="bb-cal__title">Publish</h1>
          </div>
          <div className="bb-cal__empty">
            <h3 className="bb-cal__empty-title">Select a workspace</h3>
            <p className="bb-cal__empty-copy">
              Use Switch Workspace in the top bar to load this calendar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeView = mode === 'list' ? 'agenda' : view;

  return (
    <div className="bb-cal">
      <div className="bb-cal__shell">
        <div className="bb-cal__title-row">
          <h1 className="bb-cal__title">Publish</h1>
          <div className="bb-cal__mode-toggle" role="tablist" aria-label="Publish mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'list'}
              className={`bb-cal__mode-btn${mode === 'list' ? ' is-active' : ''}`}
              onClick={() => setModeAndUrl('list')}
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'calendar'}
              className={`bb-cal__mode-btn${mode === 'calendar' ? ' is-active' : ''}`}
              onClick={() => setModeAndUrl('calendar')}
            >
              <CalIcon size={14} /> Calendar
            </button>
          </div>
        </div>

        {workspace?.label ? (
          <div className="bb-cal__workspace-hint">
            Showing posts for
            {' '}
            <strong>{workspace.label}</strong>
          </div>
        ) : null}

        <CalendarToolbar
          view={activeView}
          onViewChange={setViewAndUrl}
          currentDate={currentDate}
          onPrev={() => setCurrentDate((d) => shiftPeriod(activeView, d, -1))}
          onNext={() => setCurrentDate((d) => shiftPeriod(activeView, d, 1))}
          onToday={() => {
            const now = new Date();
            if (activeView === 'month' || activeView === 'stats') {
              setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
            } else {
              setCurrentDate(now);
            }
          }}
          status={status}
          onStatusChange={setStatus}
          channels={channels}
          onChannelsChange={setChannels}
          tags={tags}
          onTagsChange={setTags}
          tagOptions={tagOptions}
          fallbackPlatforms={fallbackPlatforms}
          search={search}
          onSearchChange={setSearch}
          clientId={clientId}
          workspaceLabel={workspace?.label || workspace?.company || ''}
          currentUser={user}
        />

        <CalendarStatistics counts={localCounts} />

        {postsLoading ? (
          <div className="bb-cal__loading">
            <Loader2 size={18} className="bb-cal__spin" />
            Loading calendar…
          </div>
        ) : (
          <Suspense fallback={<ViewFallback />}>
            {activeView === 'month' && (
              <MonthView
                month={month}
                year={year}
                postsByDate={filteredPosts}
                notesByDate={notesByDate}
                cardActions={cardActions}
                onCreateAt={goComposer}
                onDropPost={handleDropPost}
              />
            )}
            {activeView === 'week' && (
              <WeekView
                currentDate={currentDate}
                postsByDate={filteredPosts}
                cardActions={cardActions}
                onCreateAt={goComposer}
                onDropPost={handleDropPost}
                onEmptyCreate={() => goComposer(format(new Date(), 'yyyy-MM-dd'))}
              />
            )}
            {activeView === 'day' && (
              <DayView
                currentDate={currentDate}
                postsByDate={filteredPosts}
                cardActions={cardActions}
                onCreateAt={goComposer}
                onDropPost={handleDropPost}
                onEmptyCreate={() => goComposer(format(currentDate, 'yyyy-MM-dd'))}
              />
            )}
            {activeView === 'agenda' && (
              <>
                {upcoming.length > 0 && mode === 'list' ? (
                  <div className="bb-cal__agenda-group">
                    <div className="bb-cal__agenda-date">Coming up</div>
                    <UpcomingPosts posts={upcoming} />
                  </div>
                ) : null}
                <AgendaView
                  currentDate={currentDate}
                  postsByDate={filteredPosts}
                  onOpen={openPostDetail}
                  onEdit={openFormForEdit}
                  onDelete={handleDeletePost}
                  isAdmin={isAdmin}
                  scope={mode === 'list' ? 'all' : 'week'}
                  onEmptyCreate={() => goComposer(format(new Date(), 'yyyy-MM-dd'))}
                />
              </>
            )}
            {activeView === 'stats' && (
              <div className="bb-cal__body">
                <CalendarStats
                  stats={stats}
                  month={month}
                  year={year}
                  postsByDate={filteredPosts}
                />
              </div>
            )}
          </Suspense>
        )}
      </div>

      {isAdmin ? (
        <FloatingCreateButton
          onClick={() => goComposer(format(currentDate, 'yyyy-MM-dd'), DEFAULT_COMPOSE_TIME)}
        />
      ) : null}

      <PostDrawer
        post={detailPost}
        isOpen={detailOpen}
        onClose={closeDetail}
        onEdit={openFormForEdit}
        onDelete={handleDeletePost}
        onReschedule={(id, dt) => handleReschedule(id, dt, detailPost?.source || 'calendar')}
      />

      <PostFormDrawer
        date={formDate}
        post={editingPost}
        isOpen={formOpen}
        onClose={closeForm}
        onSave={handleSavePost}
        clientId={clientId}
        readOnly={!isAdmin}
      />
    </div>
  );
}
