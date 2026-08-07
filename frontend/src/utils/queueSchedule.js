/**
 * Post queue schedule: convert between user-friendly choices and 5-field cron
 * (minute hour day-of-month month day-of-week) used by backend croniter.
 *
 * Day-of-week: 0 = Sunday … 6 = Saturday (croniter / Unix convention).
 */

export const SCHEDULE_MODES = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { id: 'weekends', label: 'Weekends (Sat–Sun)' },
  { id: 'custom', label: 'Specific days' },
  { id: 'advanced', label: 'Custom cron (advanced)' },
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function padTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTime(timeStr) {
  const [h, m] = (timeStr || '10:00').split(':').map((x) => parseInt(x, 10));
  return {
    hour: Number.isFinite(h) ? h : 10,
    minute: Number.isFinite(m) ? m : 0,
  };
}

/** Expand dow field like "1-5", "1,3,5", "*" into sorted unique day numbers 0-6. */
export function expandDayOfWeekField(dow) {
  if (!dow || dow === '*') return [0, 1, 2, 3, 4, 5, 6];
  const out = new Set();
  dow.split(',').forEach((part) => {
    const p = part.trim();
    if (!p) return;
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((x) => parseInt(x.trim(), 10));
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let d = lo; d <= hi; d += 1) out.add(d);
    } else {
      const n = parseInt(p, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 6) out.add(n);
    }
  });
  return [...out].sort((a, b) => a - b);
}

function sameDays(a, b) {
  if (a.length !== b.length) return false;
  return a.every((d, i) => d === b[i]);
}

/**
 * @returns {{ mode: string, time: string, days: number[], cron: string }}
 */
export function parseCronToSchedule(rule) {
  const cron = (rule || '').trim();
  const fallback = {
    mode: 'weekdays',
    time: '10:00',
    days: [1, 2, 3, 4, 5],
    cron: cron || '0 10 * * 1-5',
  };
  if (!cron) return fallback;

  const parts = cron.split(/\s+/);
  if (parts.length !== 5) {
    return { mode: 'advanced', time: '10:00', days: [1, 2, 3, 4, 5], cron };
  }

  const [minStr, hourStr, dom, month, dow] = parts;
  if (dom !== '*' || month !== '*') {
    return { mode: 'advanced', time: '10:00', days: [1, 2, 3, 4, 5], cron };
  }

  const minute = parseInt(minStr, 10);
  const hour = parseInt(hourStr, 10);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) {
    return { mode: 'advanced', time: '10:00', days: [1, 2, 3, 4, 5], cron };
  }
  const time = padTime(hour, minute);

  if (dow === '*') {
    return { mode: 'daily', time, days: [0, 1, 2, 3, 4, 5, 6], cron };
  }

  const days = expandDayOfWeekField(dow);
  if (dow === '1-5' || sameDays(days, [1, 2, 3, 4, 5])) {
    return { mode: 'weekdays', time, days: [1, 2, 3, 4, 5], cron };
  }
  if (sameDays(days, [0, 6])) {
    return { mode: 'weekends', time, days: [0, 6], cron };
  }
  if (sameDays(days, [0, 1, 2, 3, 4, 5, 6])) {
    return { mode: 'daily', time, days, cron };
  }
  if (days.length > 0 && days.length < 7) {
    return { mode: 'custom', time, days, cron };
  }

  return { mode: 'advanced', time, days, cron };
}

function formatDayList(days) {
  return days.map((d) => DOW_LABELS[d]).join(', ');
}

function formatTime12(timeStr) {
  const { hour, minute } = parseTime(timeStr);
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const mm = String(minute).padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

/** Human-readable summary from editor state (respects selected mode, not re-guessed from cron). */
export function describeScheduleState(schedule) {
  if (!schedule) return 'No schedule set';
  if (schedule.mode === 'advanced') {
    return schedule.cron ? `Custom schedule (${schedule.cron})` : 'No schedule set';
  }
  const at = formatTime12(schedule.time);
  switch (schedule.mode) {
    case 'daily':
      return `Every day at ${at}`;
    case 'weekdays':
      return `Every weekday at ${at}`;
    case 'weekends':
      return `Every weekend at ${at}`;
    case 'custom':
      return `${formatDayList(schedule.days || [])} at ${at}`;
    default:
      return describeSchedule(buildCronFromSchedule(schedule));
  }
}

/** Human-readable summary for list/detail views. */
export function describeSchedule(rule) {
  const s = parseCronToSchedule(rule);
  if (s.mode === 'advanced') {
    return s.cron ? `Custom schedule (${s.cron})` : 'No schedule set';
  }
  const at = formatTime12(s.time);
  switch (s.mode) {
    case 'daily':
      return `Every day at ${at}`;
    case 'weekdays':
      return `Every weekday at ${at}`;
    case 'weekends':
      return `Every weekend at ${at}`;
    case 'custom':
      return `${formatDayList(s.days)} at ${at}`;
    default:
      return s.cron || 'No schedule set';
  }
}

export function buildCronFromSchedule({ mode, time, days, cron }) {
  if (mode === 'advanced') {
    return (cron || '').trim();
  }
  const { hour, minute } = parseTime(time);
  const m = minute;
  const h = hour;

  if (mode === 'daily') return `${m} ${h} * * *`;
  if (mode === 'weekdays') return `${m} ${h} * * 1-5`;
  if (mode === 'weekends') return `${m} ${h} * * 0,6`;
  if (mode === 'custom' && days?.length) {
    const sorted = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    if (!sorted.length) return `${m} ${h} * * 1`;
    return `${m} ${h} * * ${sorted.join(',')}`;
  }
  return `${m} ${h} * * 1-5`;
}

export { DOW_LABELS };
