// Container time zone far ahead of UTC: the results must only depend on the instance time zone (Paris).
process.env.TZ = 'Pacific/Kiritimati';

import {
  MAX_DATE_RANGE_DAYS,
  defaultDateRange,
  isQueryDate,
  mapWithConcurrency,
  parseDateRange,
  parseEventIdParam,
} from '../src/routes/calendar/calendar_helpers';
import { calendarApiRootUrl } from '../src/clients/calendarClient';
import { monthBounds, utcToWallClock, wallClockToUtc } from '../src/services/calendarTimeZone';

describe('calendar date and id helpers', () => {
  test('defaultDateRange returns the Paris month, whatever the container time zone', () => {
    expect(defaultDateRange(new Date('2026-09-15T12:00:00Z'))).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    // 23:30Z on Sept 30 is already Oct 1 in Paris.
    expect(defaultDateRange(new Date('2026-09-30T23:30:00Z'))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(defaultDateRange(new Date('2028-02-15T00:30:00Z'))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  test('monthBounds handles December and leap years', () => {
    expect(monthBounds('2026-12-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(monthBounds('2027-02-03')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
  });

  test.each([
    ['2026-09-20', '14:00', '2026-09-20T12:00:00Z'], // summer time, UTC+2
    ['2026-12-20', '14:00', '2026-12-20T13:00:00Z'], // winter time, UTC+1
    ['2026-09-01', '00:00:00', '2026-08-31T22:00:00Z'],
    ['2026-09-30', '23:59:59', '2026-09-30T21:59:59Z'],
    ['2026-03-29', '02:30', '2026-03-29T01:30:00Z'], // skipped by the DST jump: resolved after it (03:30 CEST)
  ])('wallClockToUtc(%s %s) in Paris is %s', (date, time, expected) => {
    expect(wallClockToUtc(date, time, 'Europe/Paris')).toBe(expected);
  });

  test.each([
    ['2026-09-20T12:00:00Z', { date: '2026-09-20', time: '14:00' }],
    ['2026-12-20T13:00:00Z', { date: '2026-12-20', time: '14:00' }],
    ['2026-09-20T23:15:00Z', { date: '2026-09-21', time: '01:15' }],
  ])('utcToWallClock(%s) in Paris is %p', (instant, expected) => {
    expect(utcToWallClock(instant, 'Europe/Paris')).toEqual(expected);
  });

  test('a typed time survives the round trip through UTC', () => {
    const stored = wallClockToUtc('2026-10-25', '09:45', 'Europe/Paris');
    expect(utcToWallClock(stored, 'Europe/Paris')).toEqual({ date: '2026-10-25', time: '09:45' });
  });

  test.each([
    ['2026-09-01', true], ['2028-02-29', true], ['2026-02-29', false], ['2026-13-01', false],
    ['01-09-2026', false], ['2026-9-1', false], ['2026-09-01T00:00:00Z', false], ['', false], [undefined, false],
  ])('isQueryDate(%p) is %p', (value, expected) => {
    expect(isQueryDate(value)).toBe(expected);
  });

  test('parseDateRange accepts up to MAX_DATE_RANGE_DAYS days and refuses longer or reversed ranges', () => {
    expect(parseDateRange('2025-01-01', '2027-12-31')).toEqual({ from: '2025-01-01', to: '2027-12-31' });
    expect(parseDateRange('2026-01-01', '2029-01-01')).toEqual({ from: '2026-01-01', to: '2029-01-01' });
    expect(MAX_DATE_RANGE_DAYS).toBe(1096);
    expect(() => parseDateRange('2026-01-01', '2029-01-02')).toThrow(/at most 1096 days/);
    expect(() => parseDateRange('2026-09-30', '2026-09-01')).toThrow(/must not be after/);
    expect(() => parseDateRange(['2026-09-01'], '2026-09-30')).toThrow(/YYYY-MM-DD/);
  });

  test.each([
    ['5', 5], ['0', null], ['1.5', null], ['-3', null], ['abc', null], ['9007199254740993', null], [undefined, null],
  ])('parseEventIdParam(%p) is %p', (value, expected) => {
    expect(parseEventIdParam(value)).toBe(expected);
  });
});

describe('mapWithConcurrency', () => {
  test('keeps the order of the results and never runs more than the limit at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const results = await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 3, async (value) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5 * (value % 4)));
      inFlight -= 1;
      return value * 2;
    });

    expect(results).toEqual(Array.from({ length: 12 }, (_, index) => index * 2));
    expect(maxInFlight).toBe(3);
  });

  test('returns an empty list without calling the task', async () => {
    const task = jest.fn();
    await expect(mapWithConcurrency([], 3, task)).resolves.toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });
});

describe('calendarApiRootUrl', () => {
  const saved = process.env.CALENDAR_API_BASE_PATH;
  afterEach(() => {
    if (saved === undefined) delete process.env.CALENDAR_API_BASE_PATH;
    else process.env.CALENDAR_API_BASE_PATH = saved;
  });

  test('fails explicitly instead of defaulting to localhost when CALENDAR_API_BASE_PATH is missing', () => {
    delete process.env.CALENDAR_API_BASE_PATH;
    expect(() => calendarApiRootUrl()).toThrow(/CALENDAR_API_BASE_PATH is not set/);
  });

  test('drops trailing slashes', () => {
    process.env.CALENDAR_API_BASE_PATH = 'http://calendar-api:3002//';
    expect(calendarApiRootUrl()).toBe('http://calendar-api:3002');
  });
});
