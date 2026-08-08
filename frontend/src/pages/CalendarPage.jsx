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
import PropTypes from 'prop-types';
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
import CalendarStatusLegend from '../components/calendar/CalendarStatusLegend';
import CalendarStatistics from '../components/calendar/CalendarStatistics';
import FloatingCreateButton from '../components/calendar/FloatingCreateButton';
import { CalendarUiProvider, useCalendarUi } from '../components/calendar/CalendarUiContext';
import CalendarPostDetailDock from '../components/calendar/CalendarPostDetailDock';
import PostDrawer from '../components/calendar/PostDrawer';
import PostFormDrawer from '../components/calendar/PostFormDrawer';
import {
  computeStatsFromPosts,
  composerUrl,
  extractPlatformsFromPosts,
  extractTagsFromPosts,
  filterPosts,
  flattenPosts,
  preserveTimeOnDate,
  shiftPeriod,
  defaultPublishListDateRange,
} from '../components/calendar/utils';
import { DEFAULT_COMPOSE_TIME } from '../components/calendar/constants';
import { usePublishCalendarConfig, PublishCalendarConfigProvider } from '../hooks/useCalendarPostStatuses';
import PublishListView from '../components/calendar/PublishListView';

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

function CalendarPinnedDock({ cardActions }) {
  const ui = useCalendarUi();
  if (!ui?.pinnedPosts?.length) return null;
  return (
    <CalendarPostDetailDock
      posts={ui.pinnedPosts}
      cardActions={cardActions}
      onUnpin={(post) => ui.setPostPinned(post, false)}
    />
  );
}

CalendarPinnedDock.propTypes = {
  cardActions: PropTypes.object,
};

export default function CalendarPage(props) {
  return (
    <PublishCalendarConfigProvider>
      <CalendarPageInner {...props} />
    </PublishCalendarConfigProvider>
  );
}

function CalendarPageInner({ clientId: propClientId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, can } = useAuth();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'staff';
  const canApprove = isAdmin || can?.('composer.approve');
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';

  const { workspaceId, workspace } = useWorkspace({ user, autoHydrate: true });
  const clientId = propClientId || workspaceId || user?.client_id || null;

  const queryTab = searchParams.get('tab');
  const queryView = searchParams.get('view');
  const queryMode = searchParams.get('mode');
  const queryYear = searchParams.get('year');
  const queryMonth = searchParams.get('month');
  const queryFrom = searchParams.get('from');
  const queryTo = searchParams.get('to');
  const defaultListRange = defaultPublishListDateRange();
  // Default: Calendar mode + Month view for the current month
  const initialView = ['month', 'week', 'day', 'agenda', 'stats', 'list'].includes(queryView)
    ? (queryView === 'list' ? 'agenda' : queryView)
    : 'month';
  const initialMode = queryMode === 'list' ? 'list' : 'calendar';

  const initialListTab = queryTab || 'queue';

  const [currentDate, setCurrentDate] = useState(() => {
    const y = queryYear ? parseInt(queryYear, 10) : NaN;
    const m = queryMonth ? parseInt(queryMonth, 10) : NaN;
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState(initialView);
  const [mode, setMode] = useState(initialMode);
  const [listTab, setListTab] = useState(initialListTab);
  const [statuses, setStatuses] = useState([]);
  const [channels, setChannels] = useState([]); // empty = All Channels
  const [tags, setTags] = useState([]); // empty = All Tags
  const [search, setSearch] = useState('');
  const [listDateRange, setListDateRange] = useState(() => ({
    from: queryFrom || defaultListRange.from,
    to: queryTo || defaultListRange.to,
  }));

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const [detailPost, setDetailPost] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  const {
    listTabs,
    approvalPills,
    tabIds,
    defaultTabId,
    loading: publishConfigLoading,
    configError: publishConfigError,
    refetchConfig,
  } = usePublishCalendarConfig();

  // Fetch full month once; channel/tag filters apply client-side (All = no restriction)
  const { postsByDate, loading: postsLoading, refetch: refetchPosts } =
    useCalendarPosts(clientId, month, year, {
      composerScope: mode === 'list' ? 'all' : 'month',
      useDateRange: mode === 'list',
      dateFrom: listDateRange.from,
      dateTo: listDateRange.to,
    });
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
    if (tabIds.includes(queryTab) && queryTab !== listTab) {
      setListTab(queryTab);
    }
    const y = queryYear ? parseInt(queryYear, 10) : NaN;
    const m = queryMonth ? parseInt(queryMonth, 10) : NaN;
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      setCurrentDate((prev) => {
        if (prev.getFullYear() === y && prev.getMonth() + 1 === m) return prev;
        return new Date(y, m - 1, 1);
      });
    }
    if (queryFrom && queryTo) {
      setListDateRange((prev) => (
        prev.from === queryFrom && prev.to === queryTo
          ? prev
          : { from: queryFrom, to: queryTo }
      ));
    }
  }, [queryView, queryMode, view, queryTab, listTab, queryYear, queryMonth, tabIds, queryFrom, queryTo]);

  useEffect(() => {
    if (!tabIds.length) return;
    if (!tabIds.includes(listTab)) {
      setListTab(defaultTabId);
    }
  }, [tabIds, defaultTabId, listTab]);

  const toolbarFilter = useMemo(
    () => ({
      statuses,
      channels,
      tags,
      search,
      dateFrom: listDateRange.from,
      dateTo: listDateRange.to,
    }),
    [statuses, channels, tags, search, listDateRange.from, listDateRange.to],
  );

  function setListDateRangeAndUrl(next) {
    setListDateRange(next);
    updateSearch({
      mode: 'list',
      view: 'agenda',
      tab: listTab,
      from: next.from,
      to: next.to,
      year: null,
      month: null,
    });
  }

  const filteredPosts = useMemo(
    () => filterPosts(postsByDate, { statuses, channels, tags, search }),
    [postsByDate, statuses, channels, tags, search],
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
    updateSearch({
      view: nextView,
      mode: mode === 'list' ? 'list' : 'calendar',
      year: String(year),
      month: String(month),
    });
  }

  function setCurrentDateAndUrl(nextDate) {
    setCurrentDate(nextDate);
    updateSearch({
      year: String(nextDate.getFullYear()),
      month: String(nextDate.getMonth() + 1),
    });
  }

  function setModeAndUrl(nextMode) {
    setMode(nextMode);
    if (nextMode === 'list') {
      setView('agenda');
      updateSearch({
        mode: 'list',
        view: 'agenda',
        tab: listTab || 'queue',
        from: listDateRange.from,
        to: listDateRange.to,
        year: null,
        month: null,
      });
    } else {
      setView((v) => (v === 'agenda' ? 'month' : v));
      updateSearch({ mode: 'calendar', view: view === 'agenda' ? 'month' : view, tab: null });
    }
  }

  function setListTabAndUrl(nextTab) {
    setListTab(nextTab);
    updateSearch({
      mode: 'list',
      view: 'agenda',
      tab: nextTab,
      from: listDateRange.from,
      to: listDateRange.to,
      year: null,
      month: null,
    });
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
    <CalendarUiProvider>
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

       

        <CalendarToolbar
          view={activeView}
          onViewChange={setViewAndUrl}
          listMode={mode === 'list'}
          listDateFrom={listDateRange.from}
          listDateTo={listDateRange.to}
          onListDateRangeChange={setListDateRangeAndUrl}
          currentDate={currentDate}
          onPrev={() => setCurrentDateAndUrl(shiftPeriod(activeView, currentDate, -1))}
          onNext={() => setCurrentDateAndUrl(shiftPeriod(activeView, currentDate, 1))}
          onToday={() => {
            const now = new Date();
            if (activeView === 'month' || activeView === 'stats') {
              setCurrentDateAndUrl(new Date(now.getFullYear(), now.getMonth(), 1));
            } else {
              setCurrentDateAndUrl(now);
            }
          }}
          statuses={statuses}
          onStatusesChange={setStatuses}
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

        {mode !== 'list' ? (
          <CalendarStatusLegend selected={statuses} onChange={setStatuses} />
        ) : null}

        <div className="bb-cal__content-scroll">
        {postsLoading && mode !== 'list' ? (
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
            {activeView === 'agenda' && mode === 'list' && (
              <PublishListView
                listTab={listTab}
                onListTabChange={setListTabAndUrl}
                postsByDate={filteredPosts}
                listTabs={listTabs}
                approvalPills={approvalPills}
                toolbarFilter={toolbarFilter}
                configLoading={publishConfigLoading}
                configError={publishConfigError}
                onRetryConfig={refetchConfig}
                postsLoading={postsLoading}
                basePath={basePath}
                clientId={clientId}
                canApprove={canApprove}
                onRefresh={refetchPosts}
                agendaProps={{
                  currentDate,
                  onOpen: openPostDetail,
                  onEdit: openFormForEdit,
                  onDelete: handleDeletePost,
                  isAdmin,
                  onEmptyCreate: () => goComposer(format(new Date(), 'yyyy-MM-dd')),
                }}
              />
            )}
            {activeView === 'agenda' && mode !== 'list' && (
              <AgendaView
                currentDate={currentDate}
                postsByDate={filteredPosts}
                onOpen={openPostDetail}
                onEdit={openFormForEdit}
                onDelete={handleDeletePost}
                isAdmin={isAdmin}
                scope="week"
                onEmptyCreate={() => goComposer(format(new Date(), 'yyyy-MM-dd'))}
              />
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
      </div>

      {isAdmin ? (
        <FloatingCreateButton
          onClick={() => goComposer(format(currentDate, 'yyyy-MM-dd'), DEFAULT_COMPOSE_TIME)}
        />
      ) : null}

      <CalendarPinnedDock cardActions={cardActions} />

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
    </CalendarUiProvider>
  );
}
