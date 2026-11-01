import {
  PARIS_TIME_ZONE,
  utcToWallClock as utcToZonedWallClock,
  wallClockToUtc as zonedWallClockToUtc,
  zonedToday as zonedTodayIn,
} from '@mairie360/bffs-lib';

// Users type wall-clock times ("14:00") in the time zone of their town hall, while Calendar API stores UTC
// instants. The conversion itself lives in @mairie360/bffs-lib (MAIR-525: BFF_Dashboard and BFF_Message read
// Calendar API too); this module only applies the time zone of the instance.

export { monthBounds } from '@mairie360/bffs-lib';

/** Time zone of the instance: `CALENDAR_TIME_ZONE` (IANA name), Europe/Paris by default. */
export function calendarTimeZone(): string {
  return process.env.CALENDAR_TIME_ZONE?.trim() || PARIS_TIME_ZONE;
}

/** UTC instant of a wall-clock `date` and `time` in the instance time zone (see the lib's `wallClockToUtc`). */
export function wallClockToUtc(date: string, time: string, timeZone = calendarTimeZone()): string {
  return zonedWallClockToUtc(date, time, timeZone);
}

/** Wall-clock date and time shown in the instance time zone at a UTC instant (see the lib's `utcToWallClock`). */
export function utcToWallClock(instant: string, timeZone = calendarTimeZone()): { date: string; time: string } {
  return utcToZonedWallClock(instant, timeZone);
}

/** Today's date (`YYYY-MM-DD`) in the instance time zone. */
export function zonedToday(now = new Date(), timeZone = calendarTimeZone()): string {
  return zonedTodayIn(now, timeZone);
}
