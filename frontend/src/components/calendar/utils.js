import {
  addDays,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  getDay,
  isBefore,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export function getMondayIndex(d) {
  return (getDay(d) + 6) % 7;
}

export function buildMonthCells(month, year) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = endOfMonth(firstDay);
  const startPad = getMondayIndex(firstDay);
  const allDays = eachDayOfInterval({ start: firstDay, end: lastDay });

  const prevMonthDays = [];
  for (let i = startPad - 1; i >= 0; i -= 1) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - (i + 1));
    prevMonthDays.push(d);
  }

  const totalCells = prevMonthDays.length + allDays.length;
  const nextPad = (7 - (totalCells % 7)) % 7;
  const nextMonthDays = [];
  for (let i = 1; i <= nextPad; i += 1) {
    const d = new Date(lastDay);
    d.setDate(d.getDate() + i);
    nextMonthDays.push(d);
  }

  return { firstDay, cells: [...prevMonthDays, ...allDays, ...nextMonthDays] };
}

export function buildWeekDays(anchorDate) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function dayMeta(day, monthAnchor) {
  const inMonth = monthAnchor ? isSameMonth(day, monthAnchor) : true;
  const today = isToday(day);
  const past = isBefore(startOfDay(day), startOfDay(new Date()));
  return {
    inMonth,
    today,
    past,
    dateStr: format(day, 'yyyy-MM-dd'),
    canSchedule: !past,
  };
}

export function flattenPosts(postsByDate = {}) {
  return Object.entries(postsByDate).flatMap(([date, posts]) =>
    (posts || []).map((p) => ({ ...p, _date: date })),
  );
}

export function extractTagsFromPosts(posts = []) {
  const set = new Set();
  posts.forEach((p) => {
    const raw = p.hashtags || p.tags || '';
    if (Array.isArray(raw)) {
      raw.forEach((t) => {
        const cleaned = String(t).replace(/^#/, '').trim();
        if (cleaned) set.add(cleaned);
      });
      return;
    }
    String(raw)
      .split(/[\s,]+/)
      .forEach((t) => {
        const cleaned = t.replace(/^#/, '').trim();
        if (cleaned) set.add(cleaned);
      });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Platforms referenced by posts (for channel filter fallback). */
export function extractPlatformsFromPosts(posts = []) {
  const set = new Set();
  posts.forEach((p) => {
    const list = Array.isArray(p.platforms) && p.platforms.length
      ? p.platforms
      : [p.platform].filter(Boolean);
    list.forEach((pl) => {
      if (pl) set.add(String(pl));
    });
  });
  return Array.from(set);
}

function postPlatforms(p) {
  if (Array.isArray(p.platforms) && p.platforms.length) return p.platforms;
  return p.platform ? [p.platform] : [];
}

function postTagBlob(p) {
  const parts = [
    p.hashtags || '',
    Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || ''),
  ];
  return parts.join(' ').toLowerCase();
}

/**
 * Client-side filters. Empty `channels` / `tags` = All (no restriction).
 */
export function filterPosts(postsByDate, {
  status = '',
  channels = [],
  tags = [],
  search = '',
} = {}) {
  const q = String(search || '').trim().toLowerCase();
  const channelSet = new Set((channels || []).filter(Boolean));
  const tagSet = new Set((tags || []).map((t) => String(t).toLowerCase().replace(/^#/, '')));
  const out = {};

  Object.entries(postsByDate || {}).forEach(([date, list]) => {
    const filtered = (list || []).filter((p) => {
      if (status && p.status !== status) return false;
      if (channelSet.size) {
        const plats = postPlatforms(p);
        if (!plats.some((pl) => channelSet.has(pl))) return false;
      }
      if (tagSet.size) {
        const blob = postTagBlob(p);
        const hit = Array.from(tagSet).some(
          (t) => blob.includes(t) || blob.includes(`#${t}`),
        );
        if (!hit) return false;
      }
      if (q) {
        const hay = [
          p.title, p.caption, p.content, p.platform, p.hashtags, p.account_name,
          Array.isArray(p.platforms) ? p.platforms.join(' ') : '',
          Array.isArray(p.tags) ? p.tags.join(' ') : '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (filtered.length) out[date] = filtered;
  });
  return out;
}

/** Map a Composer UnifiedPost list row into calendar card shape. */
export function mapComposerPostToCalendar(u) {
  const platforms = Array.isArray(u?.target_platforms) ? u.target_platforms.filter(Boolean) : [];
  const mediaUrls = Array.isArray(u?.media_urls) ? u.media_urls : [];
  return {
    id: u.id,
    source: 'composer',
    calendarKey: `composer-${u.id}`,
    title: u.title || '',
    caption: u.content || '',
    content: u.content || '',
    platform: platforms[0] || '',
    platforms,
    status: u.status || 'draft',
    scheduled_at: u.scheduled_at || null,
    published_at: u.published_at || null,
    tags: Array.isArray(u.tags) ? u.tags : [],
    hashtags: '',
    media_urls: mediaUrls,
    thumbnail_url: mediaUrls[0] || '',
    account_name: '',
  };
}

export function mapLegacyCalendarPost(p) {
  return {
    ...p,
    source: p.source || 'calendar',
    calendarKey: p.calendarKey || `calendar-${p.id}`,
    platforms: Array.isArray(p.platforms) && p.platforms.length
      ? p.platforms
      : (p.platform ? [p.platform] : []),
  };
}

function dateKeyFromIso(iso) {
  if (!iso) return null;
  const s = String(iso);
  if (s.length >= 10) return s.slice(0, 10);
  return null;
}

function inMonthYear(iso, month, year) {
  const key = dateKeyFromIso(iso);
  if (!key) return false;
  const [y, m] = key.split('-').map(Number);
  return y === Number(year) && m === Number(month);
}

/** Group composer posts for the visible month into postsByDate. */
export function groupComposerPostsByDate(posts, month, year) {
  const out = {};
  (posts || []).forEach((raw) => {
    const iso = raw.scheduled_at || raw.published_at;
    if (!inMonthYear(iso, month, year)) return;
    // Skip pure drafts with no schedule on the calendar
    if (!raw.scheduled_at && !raw.published_at) return;
    const mapped = mapComposerPostToCalendar(raw);
    const key = dateKeyFromIso(iso);
    if (!key) return;
    if (!out[key]) out[key] = [];
    out[key].push(mapped);
  });
  return out;
}

/** Merge CalendarPost + Composer maps; prefer composer when same day+title collision is rare — keep both. */
export function mergePostsByDate(...maps) {
  const out = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([date, list]) => {
      if (!out[date]) out[date] = [];
      (list || []).forEach((p) => {
        const row = p.source === 'composer' ? p : mapLegacyCalendarPost(p);
        const key = row.calendarKey;
        if (key && out[date].some((x) => x.calendarKey === key)) return;
        out[date].push(row);
      });
    });
  });
  Object.keys(out).forEach((date) => {
    out[date].sort((a, b) => {
      const ta = a.scheduled_at || a.published_at || '';
      const tb = b.scheduled_at || b.published_at || '';
      return String(ta).localeCompare(String(tb));
    });
  });
  return out;
}

export function computeStatsFromPosts(postsByDate) {
  const all = flattenPosts(postsByDate);
  const counts = {
    total: all.length,
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
    publishing: 0,
  };
  all.forEach((p) => {
    if (counts[p.status] !== undefined) counts[p.status] += 1;
  });
  return counts;
}

export function preserveTimeOnDate(dateStr, timeStr, originalIso) {
  let time = timeStr || '09:00';
  if (!timeStr && originalIso) {
    try {
      const d = parseISO(originalIso);
      time = format(d, 'HH:mm');
    } catch {
      /* keep default */
    }
  }
  return `${dateStr}T${time}:00`;
}

export function composerUrl(basePath, { date, time = '09:00', workspaceId } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('scheduled_date', date);
  if (time) params.set('scheduled_time', time.slice(0, 5));
  if (workspaceId) {
    params.set('workspace', String(workspaceId));
    params.set('client_id', String(workspaceId));
  }
  const q = params.toString();
  return `${basePath}/analytics/composer${q ? `?${q}` : ''}`;
}

export function shiftPeriod(view, currentDate, direction) {
  const d = new Date(currentDate);
  if (view === 'day') return addDays(d, direction);
  if (view === 'week' || view === 'agenda') return addDays(d, direction * 7);
  // month / stats
  d.setMonth(d.getMonth() + direction);
  return d;
}

export function periodLabel(view, currentDate) {
  if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
  if (view === 'week' || view === 'agenda') {
    const days = buildWeekDays(currentDate);
    return `${format(days[0], 'MMM d')} – ${format(days[6], 'MMM d, yyyy')}`;
  }
  return format(currentDate, 'MMMM yyyy');
}

export { startOfMonth, format, parseISO, isToday, isBefore, startOfDay };
