// Fuseau très en avance sur UTC : minuit local tombe la veille en UTC.
process.env.TZ = 'Pacific/Kiritimati';

import { defaultDateRange, isQueryDate, parseEventIdParam } from '../src/routes/calendar/calendar_helpers';

describe('calendar date and id helpers', () => {
  test('defaultDateRange returns the local month even in a timezone ahead of UTC', () => {
    expect(defaultDateRange(new Date(2026, 8, 15, 12))).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(defaultDateRange(new Date(2028, 1, 29, 0, 30))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  test.each([
    ['2026-09-01', true], ['2028-02-29', true], ['2026-02-29', false], ['2026-13-01', false],
    ['01-09-2026', false], ['2026-9-1', false], ['2026-09-01T00:00:00Z', false], ['', false], [undefined, false],
  ])('isQueryDate(%p) is %p', (value, expected) => {
    expect(isQueryDate(value)).toBe(expected);
  });

  test.each([
    ['5', 5], ['0', null], ['1.5', null], ['-3', null], ['abc', null], ['9007199254740993', null], [undefined, null],
  ])('parseEventIdParam(%p) is %p', (value, expected) => {
    expect(parseEventIdParam(value)).toBe(expected);
  });
});
