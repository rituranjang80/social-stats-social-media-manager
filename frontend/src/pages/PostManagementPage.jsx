/* ============================================================================
 *  PostManagementPage — upcoming posts with calendar-style filters & status colors.
 * ========================================================================== */
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { format, subMonths, parseISO } from 'date-fns';
import { Loader2, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import useWorkspace from '../hooks/useWorkspace';
import {
  usePostManagementPosts,
  usePostManagementSettings,
} from '../hooks/usePostManagement';
import {
  PublishCalendarConfigProvider,
  usePublishCalendarConfig,
} from '../hooks/useCalendarPostStatuses';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import PostManagementCard from '../components/post-management/PostManagementCard';
import PostManagementStatusModal from '../components/post-management/PostManagementStatusModal';
import {
  extractPlatformsFromPosts,
  extractTagsFromPosts,
  filterPosts,
  flattenPosts,
  groupPostsByDateForList,
} from '../components/calendar/utils';
import { postManagementAPI } from '../services/api';
import PageHeader from '../components/layout/PageHeader';

import '../styles/scss/calendar.scss';
import '../styles/scss/post-management.scss';

/** Default status filter ids (toolbar), from GET /api/calendar/post-statuses/ filter ids. */
export const DEFAULT_PM_STATUS_IDS = ['pending_review', 'on_hold','draft'];

export function defaultPostManagementDateRange(refDate = new Date()) {
  const to = format(refDate, 'yyyy-MM-dd');
  const from = format(subMonths(refDate, 1), 'yyyy-MM-dd');
  return { from, to };
}

const PM_STAT_BUCKETS = [
  { id: 'draft', label: 'Draft', match: ['draft'] },
  { id: 'pending_review', label: 'Pending Review', match: ['pending_review', 'pending_approval', 'pending_client'] },
  { id: 'on_hold', label: 'On Hold', match: ['on_hold', 'queued'] },
];

function bucketForPostStatus(status) {
  const s = (status || '').toLowerCase();
  const bucket = PM_STAT_BUCKETS.find((b) => b.match.includes(s));
  return bucket?.id || null;
}

function countPostManagementStats(posts) {
  const counts = Object.fromEntries(PM_STAT_BUCKETS.map((b) => [b.id, 0]));
  posts.forEach((p) => {
    const id = bucketForPostStatus(p.status);
    if (id) counts[id] += 1;
  });
  return counts;
}

function parseStatusFromUrl(searchParams) {
  if (!searchParams.has('status')) return DEFAULT_PM_STATUS_IDS;
  const raw = searchParams.get('status');
  if (raw === 'all' || raw === '') return [];
  return raw.split(',').filter(Boolean);
}

function formatGroupDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function PostManagementInner() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, can } = useAuth();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const { workspaceId, workspace } = useWorkspace({ user, autoHydrate: true });
  const clientId = workspaceId || user?.client_id || null;

  const defaultRange = defaultPostManagementDateRange();
  const queryFrom = searchParams.get('from') || defaultRange.from;
  const queryTo = searchParams.get('to') || defaultRange.to;

  const [listDateRange, setListDateRange] = useState({ from: queryFrom, to: queryTo });
  const [statuses, setStatuses] = useState(() => parseStatusFromUrl(searchParams));
  const [channels, setChannels] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [statusSavingKey, setStatusSavingKey] = useState('');
  const [statusDraft, setStatusDraft] = useState(null);

  const { settings, loading: settingsLoading } = usePostManagementSettings(clientId);
  const { postsByDate, loading, error, refetch } = usePostManagementPosts(
    clientId,
    listDateRange.from,
    listDateRange.to,
  );
  const { filters: statusFilters, loading: configLoading } = usePublishCalendarConfig();

  const canView = can('post_management.view');
  const canChangeStatus = settings?.can_change_status ?? can('post_management.change_status');
  const canViewStatusLog = settings?.can_view_status_log ?? can('post_management.view_status_log');
  const featureOn = settings?.enabled !== false;

  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const hasStatus = searchParams.has('status');
    if (from && to && hasStatus) return;

    const next = new URLSearchParams(searchParams);
    if (!from) next.set('from', defaultRange.from);
    if (!to) next.set('to', defaultRange.to);
    if (!hasStatus) next.set('status', DEFAULT_PM_STATUS_IDS.join(','));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, defaultRange.from, defaultRange.to]);

  const tagOptions = useMemo(
    () => extractTagsFromPosts(flattenPosts(postsByDate)),
    [postsByDate],
  );
  const fallbackPlatforms = useMemo(
    () => extractPlatformsFromPosts(flattenPosts(postsByDate)),
    [postsByDate],
  );

  const filteredMap = useMemo(() => filterPosts(postsByDate, {
    statuses,
    channels,
    tags,
    search,
  }), [postsByDate, statuses, channels, tags, search]);

  const posts = useMemo(() => flattenPosts(filteredMap), [filteredMap]);
  const grouped = useMemo(() => groupPostsByDateForList(posts), [posts]);
  const allInRange = useMemo(() => flattenPosts(postsByDate), [postsByDate]);
  const statCounts = useMemo(() => countPostManagementStats(allInRange), [allInRange]);

  const statusSelectOptions = useMemo(() => (
    (statusFilters || []).map((f) => ({
      value: f.id,
      label: f.label,
      rawStatus: (f.match && f.match[0]) || f.id,
    }))
  ), [statusFilters]);

  const updateSearch = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onListDateRangeChange = (range) => {
    setListDateRange(range);
    updateSearch({ from: range.from, to: range.to });
  };

  const onStatusesChange = (next) => {
    setStatuses(next);
    if (!next?.length) {
      updateSearch({ status: 'all' });
    } else {
      updateSearch({ status: next.join(',') });
    }
  };

  const onStatusChangeRequest = (post, nextStatus) => {
    if (!clientId || nextStatus === post.status) return;
    setStatusDraft({ post, nextStatus });
  };

  const confirmStatusChange = async (comment) => {
    if (!statusDraft || !clientId) return;
    const { post, nextStatus } = statusDraft;
    const key = post.calendarKey || `${post.source}-${post.id}`;
    setStatusSavingKey(key);
    try {
      await postManagementAPI.updateStatus(post.id, {
        client_id: clientId,
        status: nextStatus,
        source: post.source || 'composer',
        comment,
      });
      toast.success('Status updated');
      setStatusDraft(null);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not update status');
    } finally {
      setStatusSavingKey('');
    }
  };

  if (!canView) {
    return (
      <div className="app-page app-page--content">
        <PageHeader title="Post Management" subtitle="You do not have access to this module." />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="app-page app-page--content">
        <PageHeader title="Post Management" subtitle="Select a workspace to manage upcoming posts." />
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="bb-cal__loading" style={{ minHeight: 240 }}>
        <Loader2 size={22} className="bb-cal__spin" />
      </div>
    );
  }

  if (!featureOn) {
    return (
      <div className="app-page app-page--content">
        <PageHeader
          title="Post Management"
          subtitle="This module is turned off for the current workspace."
        />
        <div className="bb-cal__empty">
          <h3 className="bb-cal__empty-title">Post management disabled</h3>
          <p className="bb-cal__empty-copy">
            Enable it under Account settings → Workspace features, or ask a superadmin
            to turn on Post Management in Team management → Portal config.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bb-cal bb-pm">
      <div className="bb-cal__shell">
        <div className="bb-cal__title-row">
          <h1 className="bb-cal__title">Post Management</h1>
        </div>

        <CalendarToolbar
          view="agenda"
          onViewChange={() => {}}
          listMode
          showCalendarNavInList={false}
          listDateFrom={listDateRange.from}
          listDateTo={listDateRange.to}
          onListDateRangeChange={onListDateRangeChange}
          currentDate={new Date()}
          onPrev={() => {}}
          onNext={() => {}}
          onToday={() => {}}
          statuses={statuses}
          onStatusesChange={onStatusesChange}
          channels={channels}
          onChannelsChange={setChannels}
          tags={tags}
          onTagsChange={setTags}
          tagOptions={tagOptions}
          fallbackPlatforms={fallbackPlatforms}
          search={search}
          onSearchChange={setSearch}
          clientId={clientId}
          workspaceLabel={workspace?.label}
          currentUser={user}
        />

        <div className="bb-pm__stats" role="group" aria-label="Post counts for selected period">
          {PM_STAT_BUCKETS.map((b) => (
            <div key={b.id} className="bb-pm__stat">
              <span className="bb-pm__stat-value">{statCounts[b.id] ?? 0}</span>
              <span className="bb-pm__stat-label">{b.label}</span>
            </div>
          ))}
        </div>

        {loading || configLoading ? (
          <div className="bb-cal__loading">
            <Loader2 size={18} className="bb-cal__spin" />
            Loading upcoming posts…
          </div>
        ) : error ? (
          <div className="bb-cal__empty">
            <h3 className="bb-cal__empty-title">Could not load posts</h3>
            <p className="bb-cal__empty-copy">{error}</p>
            <button type="button" className="bb-cal__today-btn" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bb-cal__empty">
            <ListChecks size={32} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5 }} />
            <h3 className="bb-cal__empty-title">No posts match your filters</h3>
            <p className="bb-cal__empty-copy">
              Defaults are Draft, Pending Review, and On Hold for the last month. Widen the date range
              or add statuses in the toolbar.
            </p>
          </div>
        ) : (
          <div className="bb-pm__groups">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, dayPosts]) => (
              <section key={dateStr} className="bb-pm__group">
                <div className="bb-pm__group-head">
                  <h2 className="bb-pm__group-date">{formatGroupDate(dateStr)}</h2>
                  <span className="bb-pm__group-count">{dayPosts.length} posts</span>
                </div>
                <div className="bb-pm__list">
                  {dayPosts.map((post) => {
                    const saveKey = post.calendarKey || `${post.source}-${post.id}`;
                    return (
                      <PostManagementCard
                        key={saveKey}
                        post={post}
                        statusOptions={statusSelectOptions}
                        canChangeStatus={canChangeStatus}
                        canViewStatusLog={canViewStatusLog}
                        onStatusChangeRequest={onStatusChangeRequest}
                        statusSaving={statusSavingKey === saveKey}
                        basePath={basePath}
                        clientId={clientId}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <PostManagementStatusModal
        open={!!statusDraft}
        post={statusDraft?.post}
        nextStatus={statusDraft?.nextStatus}
        saving={!!statusSavingKey}
        onCancel={() => setStatusDraft(null)}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}

export default function PostManagementPage() {
  return (
    <PublishCalendarConfigProvider>
      <PostManagementInner />
    </PublishCalendarConfigProvider>
  );
}
