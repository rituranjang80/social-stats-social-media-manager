import {
  buildCronFromSchedule,
  describeSchedule,
  parseCronToSchedule,
} from './queueSchedule';

describe('queueSchedule', () => {
  test('weekdays cron round-trips', () => {
    const parsed = parseCronToSchedule('0 10 * * 1-5');
    expect(parsed.mode).toBe('weekdays');
    expect(parsed.time).toBe('10:00');
    expect(buildCronFromSchedule(parsed)).toBe('0 10 * * 1-5');
    expect(describeSchedule('0 10 * * 1-5')).toMatch(/weekday/i);
    expect(describeSchedule('0 10 * * 1-5')).toMatch(/10:00 AM/);
  });

  test('custom days build cron without collapsing to weekday range', () => {
    const cron = buildCronFromSchedule({
      mode: 'custom',
      time: '14:30',
      days: [1, 3, 5],
    });
    expect(cron).toBe('30 14 * * 1,3,5');
    const allWeekdays = buildCronFromSchedule({
      mode: 'custom',
      time: '10:00',
      days: [1, 2, 3, 4, 5],
    });
    expect(allWeekdays).toBe('0 10 * * 1,2,3,4,5');
  });
});
