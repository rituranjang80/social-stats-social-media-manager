/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { overviewAPI, clientsAPI } from '../services/api';
import { useClients, useDateRange, useOAuthStatus } from '../hooks/useData';
import useWorkspace from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Users, Eye, MousePointer, Play, UserPlus } from 'lucide-react';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';
import PageHeader from '../components/layout/PageHeader';
import WorkspaceChannelToolbar from '../components/analytics/WorkspaceChannelToolbar';
import { clientSettingsPath } from '../utils/workspacePaths';
import { OAUTH_PLATFORM_IDS } from '../constants/socialPlatforms';

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORM_META = {
  facebook:           { label: 'Facebook',           color: '#1877F2', lightBg: '#EBF5FF' },
  instagram:          { label: 'Instagram',          color: '#E1306C', lightBg: '#FFF0F5' },
  youtube:            { label: 'YouTube',            color: '#FF0000', lightBg: '#FFF5F5' },
  linkedin:           { label: 'LinkedIn',           color: '#0A66C2', lightBg: '#EEF4FF' },
  google_my_business: { label: 'Google My Business', color: '#34A853', lightBg: '#F0FFF4' },
};

const METRIC_META = {
  impressions:  { label: 'Impressions',  icon: Eye,         color: '#00d7ff' },
  reach:        { label: 'Reach',        icon: Users,       color: '#00d7ff' },
  clicks:       { label: 'Clicks',       icon: MousePointer,color: '#0891b2' },
  video_views:  { label: 'Video Views',  icon: Play,        color: '#00d7ff' },
  followers:    { label: 'Followers',    icon: UserPlus,    color: '#059669' },
};

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

const METRIC_KEYS = ['impressions', 'reach', 'clicks', 'video_views', 'followers'];

function mapApiTotals(totals) {
  if (!totals) return null;
  return {
    impressions: totals.total_impressions ?? totals.impressions ?? 0,
    reach: totals.total_reach ?? totals.reach ?? 0,
    clicks: totals.total_clicks ?? totals.clicks ?? 0,
    video_views: totals.total_video_views ?? totals.video_views ?? 0,
    followers: totals.total_followers ?? totals.followers ?? 0,
  };
}

function filterByPlatforms(rows, platformFilter) {
  if (!platformFilter?.length) return rows || [];
  return (rows || []).filter((p) => platformFilter.includes(p.platform));
}

function reducePlatformTotals(rows) {
  return (rows || []).reduce((acc, p) => {
    METRIC_KEYS.forEach((k) => {
      acc[k] = (acc[k] || 0) + (p[k] || 0);
    });
    return acc;
  }, {});
}

function aggregateTimeseries(rows, platformFilter) {
  const filtered = platformFilter?.length
    ? (rows || []).filter((r) => platformFilter.includes(r.platform))
    : (rows || []);
  const byDate = new Map();
  filtered.forEach((d) => {
    const key = d.date;
    const cur = byDate.get(key) || {
      date: key,
      impressions: 0,
      reach: 0,
      clicks: 0,
      video_views: 0,
      likes: 0,
      followers: 0,
    };
    cur.impressions += d.impressions || 0;
    cur.reach += d.reach || 0;
    cur.clicks += d.clicks || 0;
    cur.video_views += d.video_views || 0;
    cur.likes += d.likes || 0;
    cur.followers += d.followers || 0;
    byDate.set(key, cur);
  });
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KPICard({ label, value, prev, icon: Icon, color, loading }) {
  const change = prev != null ? pctChange(value, prev) : null;
  return (
    <div style={{
      background: 'var(--surface-card)', borderRadius: 14, padding: '20px 22px',
      border: '1px solid var(--border-default)', flex: 1, minWidth: 160,
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: color + '18',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{ height: 32, background: 'var(--surface-page)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {fmt(value || 0)}
          </div>
          {change != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700,
              color: change > 0 ? '#059669' : change < 0 ? '#dc2626' : 'var(--text-secondary)' }}>
              {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {change > 0 ? '+' : ''}{change.toFixed(1)}% vs prev period
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children, style }) {
  return (
    <div style={{
      background: 'var(--surface-card)', borderRadius: 16, border: '1px solid var(--border-default)',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)', padding: '22px 26px',
      ...style,
    }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: 18 }}>
          {title && <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: p.color, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const {
    workspaceId,
    workspace,
    isAllWorkspaces,
    switchWorkspace,
  } = useWorkspace({ user, autoHydrate: true });
  const { clients } = useClients();
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [range, setRange]               = useDateRange(30);
  const [activeMetric, setActiveMetric] = useState('impressions');
  const [syncing, setSyncing] = useState(false);

  const filterClientId = isAllWorkspaces ? null : workspaceId;
  const { status: oauthStatus, refetch: refetchOAuth } = useOAuthStatus(filterClientId);
  const connectedPlatforms = useMemo(
    () => Object.entries(oauthStatus || {})
      .filter(([, v]) => v?.status === 'active')
      .map(([k]) => k),
    [oauthStatus],
  );
  const platformFilter = selectedChannels?.length ? [...new Set(selectedChannels)] : null;
  const apiPlatform = platformFilter?.length === 1 ? platformFilter[0] : undefined;

  const basePath = '/admin';
  const settingsConnectPath = filterClientId
    ? clientSettingsPath(basePath, workspace)
    : null;

  // Overview data (all workspaces)
  const [overview, setOverview]           = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Per-workspace data
  const [summary, setSummary]           = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [timeseries, setTimeseries]     = useState([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [prevSummary, setPrevSummary]   = useState(null);

  // Compute previous period of same duration for comparison
  const daysDiff = Math.max(1, Math.round(
    (new Date(range.until) - new Date(range.since)) / 86400000
  ));
  const prevRange = {
    since: new Date(new Date(range.since) - daysDiff * 86400000).toISOString().slice(0, 10),
    until: range.since,
  };

  const fetchOverview = useCallback(() => {
    if (!isAllWorkspaces) {
      setOverviewLoading(false);
      return Promise.resolve();
    }
    setOverviewLoading(true);
    return overviewAPI.get(range)
      .then(res => setOverview(res.data))
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
  }, [range.since, range.until, isAllWorkspaces]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const refetchAnalytics = useCallback(() => {
    if (isAllWorkspaces) {
      fetchOverview();
    } else if (filterClientId) {
      const id = filterClientId;
      const platform = apiPlatform;
      setSummaryLoading(true);
      setTimeseriesLoading(true);
      Promise.all([
        clientsAPI.summary(id, { ...range, ...(platform ? { platform } : {}) }),
        clientsAPI.timeseries(id, { ...range, ...(platform ? { platform } : {}) }),
      ])
        .then(([sumRes, tsRes]) => {
          setSummary(sumRes.data);
          setTimeseries(tsRes.data?.results || tsRes.data || []);
        })
        .catch(() => {
          setSummary(null);
          setTimeseries([]);
        })
        .finally(() => {
          setSummaryLoading(false);
          setTimeseriesLoading(false);
        });
    }
    refetchOAuth?.();
  }, [isAllWorkspaces, filterClientId, range, apiPlatform, fetchOverview, refetchOAuth]);

  // ── Fetch per-workspace summary + timeseries ───────────────────────────────────
  useEffect(() => {
    if (isAllWorkspaces || !filterClientId) {
      setSummary(null);
      setTimeseries([]);
      setPrevSummary(null);
      return;
    }
    const id = filterClientId;
    const platform = apiPlatform;

    setSummaryLoading(true);
    clientsAPI.summary(id, { ...range, ...(platform ? { platform } : {}) })
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));

    clientsAPI.summary(id, {
      since: prevRange.since, until: prevRange.until,
      ...(platform ? { platform } : {}),
    })
      .then(res => setPrevSummary(res.data))
      .catch(() => setPrevSummary(null));

    setTimeseriesLoading(true);
    clientsAPI.timeseries(id, { ...range, ...(platform ? { platform } : {}) })
      .then(res => setTimeseries(res.data?.results || res.data || []))
      .catch(() => setTimeseries([]))
      .finally(() => setTimeseriesLoading(false));
  }, [filterClientId, isAllWorkspaces, apiPlatform, range.since, range.until, prevRange.since, prevRange.until]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (isAllWorkspaces) {
        await clientsAPI.syncAll();
      } else if (filterClientId) {
        const platforms = connectedPlatforms.length
          ? connectedPlatforms
          : Object.keys(PLATFORM_META);
        await clientsAPI.triggerSync(filterClientId, platforms);
      }
      setTimeout(() => {
        refetchAnalytics();
        setSyncing(false);
      }, 3000);
    } catch {
      setSyncing(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const rawPlatformRows = isAllWorkspaces
    ? (overview?.by_platform || [])
    : (summary?.by_platform || []);

  const filteredPlatformRows = filterByPlatforms(rawPlatformRows, platformFilter);

  const platformData = filteredPlatformRows.map(p => ({
    ...p,
    label: PLATFORM_META[p.platform]?.label || p.platform,
    color: PLATFORM_META[p.platform]?.color || '#00d7ff',
  }));

  const totals = reducePlatformTotals(platformData);

  const clientTotals = mapApiTotals(summary?.totals);
  const filteredClientTotals = apiPlatform && clientTotals
    ? clientTotals
    : (platformFilter?.length
      ? reducePlatformTotals(filterByPlatforms(summary?.by_platform || [], platformFilter))
      : clientTotals);

  const kpiSource = isAllWorkspaces ? totals : (filteredClientTotals || totals);

  const prevKpiSource = mapApiTotals(prevSummary?.totals);
  const prevForKpi = isAllWorkspaces ? null : prevKpiSource;

  const aggregatedTs = aggregateTimeseries(timeseries, platformFilter?.length && !apiPlatform ? platformFilter : null);

  const chartData = aggregatedTs.map(d => ({
    date:        d.date ? String(d.date).slice(5) : d.date,
    impressions: d.impressions || 0,
    reach:       d.reach       || 0,
    clicks:      d.clicks      || 0,
    video_views: d.video_views || 0,
    likes:       d.likes       || 0,
    followers:   d.followers   || 0,
  }));

  // Pie chart data from platforms
  const pieData = platformData
    .filter(p => (p[activeMetric] || 0) > 0)
    .map(p => ({ name: p.label, value: p[activeMetric] || 0, color: p.color }));

  // Platform radar data
  const radarData = Object.keys(METRIC_META).map(metric => {
    const entry = { metric: METRIC_META[metric].label };
    platformData.forEach(p => {
      entry[p.label] = p[metric] || 0;
    });
    return entry;
  });

  const isClientSelected = !isAllWorkspaces && !!filterClientId;
  const selectedClientName = workspace?.label || workspace?.company;

  const dataLoading = isClientSelected ? summaryLoading : overviewLoading;
  const channelFallbackPlatforms = isAllWorkspaces ? Object.keys(PLATFORM_META) : connectedPlatforms;

  const disconnectedPlatforms = !isAllWorkspaces && filterClientId
    ? Object.keys(PLATFORM_META).filter((p) => !connectedPlatforms.includes(p))
    : [];
  return (
    <div style={{ padding: '32px 36px', background: 'var(--surface-page)', minHeight: '10vh' }}>
      <PageHeader
        title="Analytics"
        subtitle={isAllWorkspaces
          ? `Combined across all workspaces — ${range.since} to ${range.until}`
          : (selectedClientName
            ? `${selectedClientName} — ${range.since} to ${range.until}`
            : undefined)}
        actions={(
          <button
            type="button"
            onClick={refetchAnalytics}
            style={{ ...btnSecondary, padding: '8px 12px' }}
            title="Refresh charts from database"
          >
            <RefreshCw size={14} />
          </button>
        )}
      />

      <WorkspaceChannelToolbar
        clientId={filterClientId}
        workspaceLabel={workspace?.label || ''}
        currentUser={user}
        channels={selectedChannels}
        onChannelsChange={setSelectedChannels}
        fallbackPlatforms={channelFallbackPlatforms.length ? channelFallbackPlatforms : OAUTH_PLATFORM_IDS}
        range={range}
        onRangeChange={setRange}
        onSync={handleSync}
        syncing={syncing}
        syncDisabled={isAllWorkspaces}
        syncLabel="Sync data"
        style={{ marginBottom: 20 }}
      />

      {!isAllWorkspaces && filterClientId && connectedPlatforms.length === 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 12,
          background: 'var(--surface-card)', border: '1px solid var(--border-default)',
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          No social accounts connected for this workspace. Metrics come from the database after sync —{' '}
          {settingsConnectPath ? (
            <Link to={settingsConnectPath} style={{ color: '#00d7ff', fontWeight: 700 }}>
              Connect accounts
            </Link>
          ) : (
            'connect accounts in workspace settings'
          )}
          {' '}then use <strong>Sync data</strong>.
        </div>
      )}

      {!isAllWorkspaces && disconnectedPlatforms.length > 0 && connectedPlatforms.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 18px', borderRadius: 12,
          background: 'var(--surface-sunken)', fontSize: 12, color: 'var(--text-tertiary)',
        }}>
          Not connected: {disconnectedPlatforms.map((p) => PLATFORM_META[p]?.label || p).join(', ')}.
          {settingsConnectPath && (
            <> <Link to={settingsConnectPath} style={{ color: '#00d7ff', fontWeight: 600 }}>Connect</Link></>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="analytics-kpi-grid" style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(METRIC_META).map(([key, meta]) => (
          <KPICard
            key={key}
            label={meta.label}
            value={kpiSource?.[key]}
            prev={prevForKpi?.[key]}
            icon={meta.icon}
            color={meta.color}
            loading={dataLoading}
          />
        ))}
      </div>

      {/* ── Row 1: Timeseries (client) or Platform Bars (all) ─────────────── */}
      {isClientSelected ? (
        <SectionCard
          title={`Performance Over Time — ${selectedClientName}`}
          subtitle="Daily metrics for the selected period and platform"
          style={{ marginBottom: 24 }}
        >
          {/* Metric selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {Object.entries(METRIC_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                  background:  activeMetric === key ? meta.color : 'var(--surface-sunken)',
                  borderColor: activeMetric === key ? meta.color : 'var(--border-default)',
                  color:       activeMetric === key ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {meta.label}
              </button>
            ))}
          </div>

          {timeseriesLoading ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <EmptyChart message="No data for this period. Try syncing the user first." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={METRIC_META[activeMetric].color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={METRIC_META[activeMetric].color} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sunken)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  name={METRIC_META[activeMetric].label}
                  stroke={METRIC_META[activeMetric].color}
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Performance by Platform"
          subtitle={`Aggregated across all clients — ${range.since} to ${range.until}`}
          style={{ marginBottom: 24 }}
        >
          {dataLoading ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              Loading chart…
            </div>
          ) : platformData.length === 0 ? (
            <EmptyChart message="No data yet. Use Sync data to pull metrics from connected accounts." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={platformData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sunken)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="impressions" name="Impressions" radius={[4,4,0,0]}>
                  {platformData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      )}

      {/* ── Row 2: Two-column ─────────────────────────────────────────────── */}
      <div className="analytics-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Platform distribution pie */}
        <SectionCard
          title="Platform Distribution"
          subtitle={`Share of ${METRIC_META[activeMetric]?.label || 'impressions'}`}
        >
          {/* Metric pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(METRIC_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                style={{
                  padding: '3px 10px', borderRadius: 20, border: '1px solid',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background:  activeMetric === key ? meta.color : 'var(--surface-sunken)',
                  borderColor: activeMetric === key ? meta.color : 'var(--border-default)',
                  color:       activeMetric === key ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                {meta.label}
              </button>
            ))}
          </div>

          {dataLoading || pieData.length === 0 ? (
            <EmptyChart height={200} message={dataLoading ? 'Loading…' : 'No platform data yet.'} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Multi-metric bar comparison */}
        <SectionCard
          title="Platform Metrics Comparison"
          subtitle="Side-by-side reach vs clicks vs video views"
        >
          {dataLoading || platformData.length === 0 ? (
            <EmptyChart height={240} message={dataLoading ? 'Loading…' : 'No data yet.'} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={platformData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sunken)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="reach"       name="Reach"       fill="#00d7ff" radius={[3,3,0,0]} />
                <Bar dataKey="clicks"      name="Clicks"      fill="#0891b2" radius={[3,3,0,0]} />
                <Bar dataKey="video_views" name="Video Views" fill="#00d7ff" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Multi-metric timeseries (client) or Radar (all) ────────── */}
      {isClientSelected ? (
        <SectionCard
          title="All Metrics Over Time"
          subtitle="Impressions, reach, clicks, and video views together"
          style={{ marginBottom: 24 }}
        >
          {timeseriesLoading || chartData.length === 0 ? (
            <EmptyChart height={260} message={timeseriesLoading ? 'Loading…' : 'No timeseries data.'} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sunken)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="impressions"  name="Impressions"  stroke="#00d7ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reach"        name="Reach"        stroke="#00d7ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks"       name="Clicks"       stroke="#0891b2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="video_views"  name="Video Views"  stroke="#00d7ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Platform Balance Radar"
          subtitle="Relative strength across all metrics per platform"
          style={{ marginBottom: 24 }}
        >
          {dataLoading || platformData.length === 0 ? (
            <EmptyChart height={260} message={dataLoading ? 'Loading…' : 'No data yet.'} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius={90} data={radarData}>
                <PolarGrid stroke="var(--border-default)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={(v) => fmt(v)} />
                {platformData.map((p, i) => (
                  <Radar
                    key={p.platform}
                    name={p.label}
                    dataKey={p.label}
                    stroke={p.color}
                    fill={p.color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      )}

      {/* ── Row 4: Platform breakdown table ───────────────────────────────── */}
      <SectionCard
        title="Platform Breakdown"
        subtitle="Detailed metrics per platform"
        style={{ marginBottom: 24 }}
      >
        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>Loading…</div>
        ) : platformData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
            No platform data. Sync clients to populate analytics.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-page)' }}>
                  {['Platform', 'Impressions', 'Reach', 'Clicks', 'Video Views', 'Followers', 'CTR'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontWeight: 700,
                      color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platformData.map((p, i) => {
                  const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--surface-sunken)' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: PLATFORM_META[p.platform]?.lightBg || '#e6fbff',
                          }}>
                            <SocialPlatformIcon platform={p.platform} size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#00d7ff' }}>{fmt(p.impressions)}</td>
                      <td style={{ padding: '13px 16px', color: '#00d7ff', fontWeight: 600 }}>{fmt(p.reach)}</td>
                      <td style={{ padding: '13px 16px' }}>{fmt(p.clicks)}</td>
                      <td style={{ padding: '13px 16px' }}>{fmt(p.video_views)}</td>
                      <td style={{ padding: '13px 16px' }}>{fmt(p.followers)}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            height: 6, width: 80, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              width: `${Math.min(parseFloat(ctr) * 20, 100)}%`,
                              background: p.color,
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{ctr}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

     
    </div>
  );
}

function EmptyChart({ height = 200, message }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', fontSize: 13, gap: 8,
    }}>
      <div style={{ fontSize: 32 }}>📊</div>
      <div>{message}</div>
    </div>
  );
}

const btnSecondary = {
  display: 'flex', alignItems: 'center', gap: 6,
  borderRadius: 10, border: '1.5px solid var(--border-default)',
  background: 'var(--surface-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
};
