/* ============================================================================
 * QueueScheduleEditor — friendly schedule UI; stores 5-field cron for API.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {
  SCHEDULE_MODES,
  DOW_LABELS,
  parseCronToSchedule,
  buildCronFromSchedule,
  describeScheduleState,
} from '../../utils/queueSchedule';

const chipStyle = (on) => ({
  padding: '6px 10px',
  borderRadius: 'var(--radius-md)',
  border: `1.5px solid ${on ? 'var(--brand-primary)' : 'var(--border-default)'}`,
  background: on ? 'var(--brand-primary-soft)' : 'var(--surface-card)',
  color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: on ? 600 : 500,
  cursor: 'pointer',
  minHeight: 'unset',
  minWidth: 'unset',
});

function applyModeDefaults(next, partial) {
  if (partial.mode === 'weekdays') next.days = [1, 2, 3, 4, 5];
  if (partial.mode === 'weekends') next.days = [0, 6];
  if (partial.mode === 'daily') next.days = [0, 1, 2, 3, 4, 5, 6];
  if (partial.mode === 'custom' && !next.days?.length) next.days = [1];
  if (partial.mode === 'advanced' && !next.cron) {
    next.cron = buildCronFromSchedule({ ...next, mode: 'weekdays' });
  }
  return next;
}

export default function QueueScheduleEditor({ value, onChange, inputStyle, helpStyle }) {
  const [schedule, setSchedule] = useState(() => parseCronToSchedule(value));

  // Re-sync when parent value changes externally (e.g. modal reset), not when we just emitted it.
  useEffect(() => {
    const external = (value || '').trim();
    const internal = buildCronFromSchedule(schedule).trim();
    if (external !== internal) {
      setSchedule(parseCronToSchedule(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps -- schedule compared intentionally

  function commit(next) {
    const cron = buildCronFromSchedule(next);
    const withCron = { ...next, cron: next.mode === 'advanced' ? (next.cron || '').trim() : cron };
    setSchedule(withCron);
    onChange(withCron.mode === 'advanced' ? withCron.cron : cron);
  }

  function patch(partial) {
    let next = applyModeDefaults({ ...schedule, ...partial }, partial);
    commit(next);
  }

  function toggleDay(d) {
    const set = new Set(schedule.days || []);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    const days = [...set].sort((a, b) => a - b);
    if (!days.length) return;
    commit(applyModeDefaults({ ...schedule, mode: 'custom', days }, { mode: 'custom' }));
  }

  const summary = describeScheduleState(schedule);

  return (
    <div className="queue-schedule-editor">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {SCHEDULE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            style={chipStyle(schedule.mode === m.id)}
            onClick={() => patch({ mode: m.id })}
          >
            {m.label}
          </button>
        ))}
      </div>

      {schedule.mode !== 'advanced' ? (
        <label style={{ display: 'block', marginBottom: 10 }}>
          <span style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--text-tertiary)', textTransform: 'uppercase',
            letterSpacing: 0.4, marginBottom: 6,
          }}
          >
            Time
          </span>
          <input
            type="time"
            value={schedule.time}
            onChange={(e) => patch({ time: e.target.value })}
            style={inputStyle}
          />
        </label>
      ) : null}

      {schedule.mode === 'custom' ? (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--text-tertiary)', textTransform: 'uppercase',
            letterSpacing: 0.4, marginBottom: 6,
          }}
          >
            Days
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DOW_LABELS.map((label, d) => {
              const on = (schedule.days || []).includes(d);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  style={{
                    ...chipStyle(on),
                    minWidth: 44,
                    textAlign: 'center',
                  }}
                  onClick={() => toggleDay(d)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {schedule.mode === 'advanced' ? (
        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--text-tertiary)', textTransform: 'uppercase',
            letterSpacing: 0.4, marginBottom: 6,
          }}
          >
            Cron expression
          </span>
          <input
            value={schedule.cron || ''}
            onChange={(e) => {
              const cron = e.target.value;
              const next = { ...schedule, mode: 'advanced', cron };
              setSchedule(next);
              onChange(cron);
            }}
            placeholder="0 10 * * 1-5"
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
          />
          <span style={helpStyle}>
            Five fields: minute hour day-of-month month day-of-week. Example:
            {' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>0 10 * * 1-5</code>
            {' '}
            = 10:00 AM Monday–Friday.
          </span>
        </label>
      ) : null}

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Summary: </strong>
        {summary}
        {schedule.mode !== 'advanced' ? (
          <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Times use your workspace timezone. The next free slot runs when the queue is active.
          </span>
        ) : null}
      </div>
    </div>
  );
}

export { describeSchedule } from '../../utils/queueSchedule';
